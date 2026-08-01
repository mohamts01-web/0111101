import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import {
  aiOperations,
  modelForOperation,
  operationInstruction,
  resumeAiSchema,
  type AiOperation,
  type AiResume,
  type ResumeAiResult,
} from '@/lib/resume-ai';
import { CV_PRODUCT_NAME } from '@/lib/brand';
import { recordActivity } from '@/lib/activity';

export const runtime = 'nodejs';

type RequestBody = {
  operation: AiOperation;
  language: 'ar' | 'en';
  resume: AiResume;
  prompt?: string;
  jobDescription?: string;
  idempotencyKey?: string;
  source?: 'guided' | 'pdf_import';
  guidedData?: {
    linkedinUrl?: string;
    jobs?: Array<{
      title: string;
      company: string;
      location?: string;
      start: string;
      end: string;
      responsibilities?: string;
    }>;
    desiredTitle?: string;
    education?: Array<{
      institution: string;
      degree: string;
      fieldOfStudy?: string;
      start: string;
      end: string;
    }>;
    skills?: string[];
    highlights?: string;
    goals?: string;
    importedText?: string;
  };
};

const privateResumeFields = new Set(['email', 'phone', 'link']);

function redactResume(resume: AiResume) {
  return Object.fromEntries(
    Object.entries(resume).map(([key, value]) => [key, privateResumeFields.has(key) ? '' : value]),
  );
}

function restorePrivateFields(result: ResumeAiResult, original: AiResume) {
  if (!result.resume) return result;
  for (const field of privateResumeFields) result.resume[field] = original[field] || '';
  return result;
}

const unsupportedMetaPattern =
  /\s*\((?=[^)]*(?:لا توجد|غير متوفر|غير مذكور|غير معروف|لم يتم|المعلنة|لا تتوفر|not provided|not available|no details|missing|insufficient))[^)]*\)/gi;
const unsupportedMetaLinePattern = /^(?:ملاحظة|تنبيه|Note|Disclaimer)\s*:/i;

const unsupportedArabicMetaPattern =
  /\s*\((?=[^)]*(?:\u0644\u0627\s+\u062a\u0648\u062c\u062f|\u063a\u064a\u0631\s+\u0645\u062a\u0648\u0641\u0631|\u063a\u064a\u0631\s+\u0645\u0630\u0643\u0648\u0631|\u0644\u0645\s+\u064a\u062a\u0645|\u0627\u0644\u0645\u0639\u0644\u0646\u0629))[^)]*\)/gi;

function sanitizeResumeForDisplay(result: ResumeAiResult) {
  if (!result.resume) return result;
  const cleaned = Object.fromEntries(
    Object.entries(result.resume).map(([key, value]) => {
      if (typeof value !== 'string') return [key, value];
      const next = value
        .split('\n')
        .map((line) =>
          line
            .replace(unsupportedMetaPattern, '')
            .replace(unsupportedArabicMetaPattern, '')
            .replace(unsupportedMetaLinePattern, '')
            .trim(),
        )
        .filter(Boolean)
        .join('\n');
      return [key, next];
    }),
  ) as AiResume;
  result.resume = cleaned;
  return result;
}

async function requestModel(apiKey: string, model: string, system: string, userContent: string) {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000',
      'X-Title': CV_PRODUCT_NAME,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_schema', json_schema: resumeAiSchema },
      provider: {
        require_parameters: true,
        data_collection: 'deny',
        ...(process.env.OPENROUTER_REQUIRE_ZDR === 'true' ? { zdr: true } : {}),
      },
    }),
  });
  if (!response.ok) throw new Error(`OPENROUTER_${response.status}`);
  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error('EMPTY_AI_RESPONSE');
  return { result: JSON.parse(content) as ResumeAiResult, usage: payload.usage };
}

function mergeDualResults(first: ResumeAiResult, second: ResumeAiResult): ResumeAiResult {
  const unique = (values: string[]) => [...new Set(values.filter(Boolean))];
  const analyses = [first.analysis, second.analysis].filter((value): value is NonNullable<ResumeAiResult['analysis']> =>
    Boolean(value),
  );
  const average = (key: keyof NonNullable<ResumeAiResult['analysis']>['breakdown']) =>
    analyses.length
      ? Math.round(analyses.reduce((sum, analysis) => sum + analysis.breakdown[key], 0) / analyses.length)
      : 0;
  return {
    message: unique([first.message, second.message]).join('\n\n'),
    resume: first.resume ?? second.resume,
    coverLetter: first.coverLetter ?? second.coverLetter,
    review: first.review ?? second.review,
    analysis: analyses.length
      ? {
          score: Math.round(analyses.reduce((sum, analysis) => sum + analysis.score, 0) / analyses.length),
          strengths: unique(analyses.flatMap((analysis) => analysis.strengths)),
          missingKeywords: unique(analyses.flatMap((analysis) => analysis.missingKeywords)),
          improvements: unique(analyses.flatMap((analysis) => analysis.improvements)),
          atsIssues: unique(analyses.flatMap((analysis) => analysis.atsIssues)),
          breakdown: {
            keywords: average('keywords'),
            experience: average('experience'),
            education: average('education'),
            achievements: average('achievements'),
            completeness: average('completeness'),
            formatting: average('formatting'),
          },
        }
      : null,
  };
}

export async function POST(request: Request) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'لم يتم إعداد خدمة الذكاء الاصطناعي بعد.' }, { status: 503 });

  const authorization = request.headers.get('authorization');
  const supabase = authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();
  if (userError || !user)
    return NextResponse.json({ error: 'يجب تسجيل الدخول لاستخدام الذكاء الاصطناعي.' }, { status: 401 });

  let body: RequestBody;
  try {
    body = (await request.json()) as RequestBody;
  } catch {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }

  if (!aiOperations.includes(body.operation) || !body.resume || !['ar', 'en'].includes(body.language)) {
    return NextResponse.json({ error: 'بيانات الطلب غير مكتملة.' }, { status: 400 });
  }
  if (body.jobDescription && body.jobDescription.length > 20_000) {
    return NextResponse.json({ error: 'الوصف الوظيفي طويل جداً.' }, { status: 400 });
  }

  const internal = await createInternalClient();
  const idempotencyKey = body.idempotencyKey || crypto.randomUUID();
  const guidedClaimRequired = body.operation === 'guided_resume' && body.source !== 'pdf_import';
  const primaryModel = modelForOperation('assistant_message');
  const translationModel = modelForOperation('translate_section');
  const models =
    body.operation === 'dual_review' ? [primaryModel, translationModel] : [modelForOperation(body.operation)];
  const model = models.join(' + ');
  const requestId = crypto.randomUUID();

  let guidedTrial = false;
  if (guidedClaimRequired) {
    const { data: trialClaim, error: trialClaimError } = await internal.rpc('claim_guided_resume', {
      p_user_id: user.id,
    });
    const claimed = trialClaim;
    const claimError = trialClaimError;
    if (claimError) return NextResponse.json({ error: 'تعذر التحقق من أهلية التجربة المجانية.' }, { status: 503 });
    guidedTrial = Boolean(claimed);
  }

  const { data: charge, error: chargeError } = guidedTrial
    ? { data: null, error: null }
    : await internal.rpc('consume_effective_ai_credits', {
        p_user_id: user.id,
        p_operation_key: body.operation,
        p_idempotency_key: idempotencyKey,
      });
  if (chargeError) {
    const insufficient = chargeError.message.includes('Insufficient credits');
    return NextResponse.json(
      {
        error: insufficient ? 'رصيدك غير كافٍ لتنفيذ هذه العملية.' : 'تعذر التحقق من الرصيد.',
        code: insufficient ? 'INSUFFICIENT_CREDITS' : 'CREDITS_UNAVAILABLE',
      },
      { status: insufficient ? 402 : 503 },
    );
  }

  await internal.from('ai_requests').insert({
    id: requestId,
    user_id: user.id,
    operation_key: body.operation,
    source: body.source || 'standard',
    model,
    status: 'started',
    credits_charged: Number((charge as { cost?: number } | null)?.cost || 0),
  });

  try {
    const system = operationInstruction(body.operation, body.language, body.jobDescription);
    const userContent = JSON.stringify({
      request: body.prompt || '',
      resume: redactResume(body.resume),
      guidedData: body.guidedData || null,
    });
    const outputs = await Promise.all(
      models.map((currentModel) => requestModel(apiKey, currentModel, system, userContent)),
    );
    const combined = outputs.length === 2 ? mergeDualResults(outputs[0].result, outputs[1].result) : outputs[0].result;
    const result = sanitizeResumeForDisplay(restorePrivateFields(combined, body.resume));
    const inputTokens = outputs.reduce((sum, output) => sum + (output.usage?.prompt_tokens ?? 0), 0);
    const outputTokens = outputs.reduce((sum, output) => sum + (output.usage?.completion_tokens ?? 0), 0);

    await internal
      .from('ai_requests')
      .update({
        status: 'succeeded',
        input_tokens: inputTokens || null,
        output_tokens: outputTokens || null,
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);

    if (guidedTrial) {
      const { error: completeError } = await internal.rpc('complete_guided_resume', { p_user_id: user.id });
      if (completeError) throw completeError;
    }

    void recordActivity({
      userId: user.id,
      eventType: 'ai.operation_completed',
      entityType: 'ai_request',
      entityId: requestId,
      metadata: { operation: body.operation, credits: Number((charge as { cost?: number } | null)?.cost || 0) },
    });
    return NextResponse.json({ result, model, credits: charge });
  } catch (error) {
    if (guidedTrial) await internal.rpc('release_guided_resume', { p_user_id: user.id });
    if (charge) await internal.rpc('refund_ai_credits', { p_user_id: user.id, p_idempotency_key: idempotencyKey });
    await internal
      .from('ai_requests')
      .update({
        status: 'failed',
        error_code: error instanceof Error ? error.message.slice(0, 80) : 'UNKNOWN',
        completed_at: new Date().toISOString(),
      })
      .eq('id', requestId);
    return NextResponse.json({ error: 'تعذر إكمال الطلب الآن، وتمت إعادة النقاط إلى رصيدك.' }, { status: 502 });
  }
}
