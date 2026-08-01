import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { convertToModelMessages, streamText, type UIMessage } from 'ai';
import { NextResponse } from 'next/server';
import { CV_PRODUCT_NAME } from '@/lib/brand';
import { modelForOperation, type AiResume } from '@/lib/resume-ai';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';
import { recordActivity } from '@/lib/activity';

export const runtime = 'nodejs';

type ChatRequest = {
  messages: UIMessage[];
  resume: AiResume;
  language: 'ar' | 'en';
  resumeId?: string;
  sectionField?: keyof AiResume;
};

const privateResumeFields = new Set(['email', 'phone', 'link']);

function redactResume(resume: AiResume) {
  return Object.fromEntries(
    Object.entries(resume).map(([key, value]) => [key, privateResumeFields.has(key) ? '' : value]),
  );
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

  let body: ChatRequest;
  try {
    body = (await request.json()) as ChatRequest;
  } catch {
    return NextResponse.json({ error: 'بيانات الطلب غير صالحة.' }, { status: 400 });
  }
  if (!Array.isArray(body.messages) || !body.resume || !['ar', 'en'].includes(body.language))
    return NextResponse.json({ error: 'بيانات المحادثة غير مكتملة.' }, { status: 400 });

  const internal = await createInternalClient();
  const idempotencyKey = crypto.randomUUID();
  const requestId = crypto.randomUUID();
  const model = modelForOperation('assistant_message');
  const { data: charge, error: chargeError } = await internal.rpc('consume_effective_ai_credits', {
    p_user_id: user.id,
    p_operation_key: 'assistant_message',
    p_idempotency_key: idempotencyKey,
  });
  if (chargeError) {
    const insufficient = chargeError.message.includes('Insufficient credits');
    return NextResponse.json(
      {
        error: insufficient ? 'رصيدك غير كافٍ لإرسال رسالة جديدة.' : 'تعذر التحقق من الرصيد.',
        code: insufficient ? 'INSUFFICIENT_CREDITS' : 'CREDITS_UNAVAILABLE',
      },
      { status: insufficient ? 402 : 503 },
    );
  }

  await internal.from('ai_requests').insert({
    id: requestId,
    user_id: user.id,
    operation_key: 'assistant_message',
    model,
    status: 'started',
    credits_charged: Number((charge as { cost?: number } | null)?.cost || 0),
  });

  let settled = false;
  const refund = async (code: string) => {
    if (settled) return;
    settled = true;
    await internal.rpc('refund_ai_credits', { p_user_id: user.id, p_idempotency_key: idempotencyKey });
    await internal
      .from('ai_requests')
      .update({ status: 'failed', error_code: code, completed_at: new Date().toISOString() })
      .eq('id', requestId);
  };

  try {
    const provider = createOpenAICompatible({
      name: 'openrouter',
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey,
      includeUsage: true,
      headers: {
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL || 'http://127.0.0.1:3000',
        'X-Title': CV_PRODUCT_NAME,
      },
      transformRequestBody: (input) => ({
        ...input,
        provider: {
          require_parameters: true,
          data_collection: 'deny',
          ...(process.env.OPENROUTER_REQUIRE_ZDR === 'true' ? { zdr: true } : {}),
        },
      }),
    });
    const outputLanguage = body.language === 'ar' ? 'العربية' : 'English';
    const system = `أنت المساعد المهني لمنصة ${CV_PRODUCT_NAME}. أجب بلغة ${outputLanguage} وبأسلوب واضح ومختصر. ساعد المستخدم على فهم سيرته وتحسينها، ولا تختلق خبرة أو مهارة أو رقمًا غير موجود. إذا كان الطلب يتطلب تعديلًا فعليًا، اشرح ما تقترحه واطلب من المستخدم تشغيل الأداة المناسبة من أزرار الإجراءات حتى تظهر مقارنة قابلة للحفظ والتراجع. بيانات السيرة الحالية بعد إخفاء بيانات الاتصال الحساسة:\n${JSON.stringify(redactResume(body.resume))}`;
    const contextualSystem = `${system}\nThe user is currently working on the "${body.sectionField || 'summary'}" section. Prioritize that section when their request is ambiguous.`;
    const result = streamText({
      model: provider.chatModel(model),
      system: contextualSystem,
      messages: await convertToModelMessages(body.messages.slice(-20)),
      onFinish: async ({ totalUsage }) => {
        if (settled) return;
        settled = true;
        await internal
          .from('ai_requests')
          .update({
            status: 'succeeded',
            input_tokens: totalUsage.inputTokens || null,
            output_tokens: totalUsage.outputTokens || null,
            completed_at: new Date().toISOString(),
          })
          .eq('id', requestId);
        void recordActivity({
          userId: user.id,
          eventType: 'ai.chat_completed',
          entityType: 'ai_request',
          entityId: requestId,
          metadata: { credits: Number((charge as { cost?: number } | null)?.cost || 0) },
        });
      },
      onError: async () => {
        await refund('STREAM_FAILED');
      },
      onAbort: async () => {
        await refund('STREAM_ABORTED');
      },
    });
    return result.toUIMessageStreamResponse();
  } catch (error) {
    await refund(error instanceof Error ? error.message.slice(0, 80) : 'CHAT_FAILED');
    return NextResponse.json({ error: 'تعذر بدء المحادثة، وتمت إعادة النقطة إلى رصيدك.' }, { status: 502 });
  }
}
