import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { resolveEffectiveEntitlement } from '@/lib/effective-entitlement';
import { freeExportAllowance, resumeExportPeriodKey, type ResumeExportOperation } from '@/lib/resume-limits';
import { recordActivity } from '@/lib/activity';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

type ResumeExportRequest = {
  resumeId?: string;
  operation?: ResumeExportOperation;
  idempotencyKey?: string;
};

async function clientForRequest(request: Request) {
  const authorization = request.headers.get('authorization');
  return authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : createClient();
}

export async function POST(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'سجّل الدخول قبل تصدير السيرة الذاتية.' }, { status: 401 });

  let body: ResumeExportRequest;
  try {
    body = (await request.json()) as ResumeExportRequest;
  } catch {
    return NextResponse.json({ error: 'بيانات طلب التصدير غير صالحة.' }, { status: 400 });
  }

  if (
    !body.resumeId ||
    !body.idempotencyKey ||
    !['download', 'email'].includes(body.operation ?? '') ||
    body.idempotencyKey.length > 120
  ) {
    return NextResponse.json({ error: 'بيانات طلب التصدير غير مكتملة.' }, { status: 400 });
  }

  try {
    const internal = await createInternalClient();
    const entitlement = await resolveEffectiveEntitlement(internal, user.id);
    const allowance = freeExportAllowance(entitlement.plan);
    const { data, error } = await internal.rpc('authorize_resume_export', {
      p_user_id: user.id,
      p_resume_id: body.resumeId,
      p_operation: body.operation,
      p_entitlement_plan: entitlement.plan,
      p_period_key: resumeExportPeriodKey(entitlement),
      p_free_quota: allowance ?? 0,
      p_idempotency_key: body.idempotencyKey,
    });

    if (error) {
      const insufficient = error.message.includes('Insufficient credits');
      const missingResume = error.message.includes('Resume not found');
      return NextResponse.json(
        {
          error: insufficient
            ? 'انتهت فرص التصدير المجانية ولا يتوفر لديك 10 نقاط لإتمام العملية.'
            : missingResume
              ? 'تعذر العثور على السيرة الذاتية.'
              : 'تعذر تفويض التصدير الآن.',
          code: insufficient ? 'INSUFFICIENT_CREDITS' : missingResume ? 'RESUME_NOT_FOUND' : 'EXPORT_UNAVAILABLE',
        },
        { status: insufficient ? 402 : missingResume ? 404 : 503 },
      );
    }

    const authorization = data as {
      authorization_id: string;
      credits_charged: number;
      uses_free_quota: boolean;
      duplicate: boolean;
      status: 'authorized' | 'completed';
    };
    if (!authorization.duplicate) {
      void recordActivity({
        userId: user.id,
        eventType: `resume.${body.operation}_authorized`,
        entityType: 'resume',
        entityId: body.resumeId,
        metadata: { chargedCredits: authorization.credits_charged, usedFreeQuota: authorization.uses_free_quota },
      });
    }

    return NextResponse.json({
      authorizationId: authorization.authorization_id,
      status: authorization.status,
      chargedCredits: authorization.credits_charged,
      usedFreeQuota: authorization.uses_free_quota,
      watermarkRequired: entitlement.plan === 'free',
      plan: entitlement.plan,
    });
  } catch (error) {
    console.error('Resume export authorization failed', error);
    return NextResponse.json({ error: 'تعذر التحقق من استحقاق التصدير.' }, { status: 503 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await clientForRequest(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'غير مصرح.' }, { status: 401 });

  let body: { authorizationId?: string };
  try {
    body = (await request.json()) as { authorizationId?: string };
  } catch {
    return NextResponse.json({ error: 'بيانات الإلغاء غير صالحة.' }, { status: 400 });
  }
  if (!body.authorizationId || !/^[0-9a-f-]{36}$/i.test(body.authorizationId)) {
    return NextResponse.json({ error: 'تفويض الإرسال غير صالح.' }, { status: 400 });
  }

  const internal = await createInternalClient();
  const { error } = await internal.rpc('cancel_resume_email_export', {
    p_user_id: user.id,
    p_authorization_id: body.authorizationId,
  });
  if (error) {
    console.error('Resume email export cancellation failed', error);
    return NextResponse.json({ error: 'تعذر إلغاء تفويض الإرسال.' }, { status: 503 });
  }
  return NextResponse.json({ cancelled: true });
}
