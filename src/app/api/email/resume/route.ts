import { NextResponse } from 'next/server';
import { CV_PRODUCT_NAME } from '@/lib/brand';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/utils/supabase/server';
import { createClient as createInternalClient } from '@/utils/supabase/server-internal';

export const runtime = 'nodejs';

const guestAttempts = new Map<string, number[]>();

export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  const supabase = authorization
    ? createSupabaseClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
        global: { headers: { Authorization: authorization } },
        auth: { persistSession: false },
      })
    : await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (
    !process.env.RESEND_API_KEY ||
    !process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM_EMAIL.includes('your-verified-domain.com')
  ) {
    return NextResponse.json({ error: 'خدمة البريد غير مهيأة بعد.' }, { status: 503 });
  }
  const body = (await request.json()) as {
    filename?: string;
    pdfBase64?: string;
    language?: 'ar' | 'en';
    recipientEmail?: string;
    website?: string;
    authorizationId?: string;
  };
  if (body.website) return NextResponse.json({ sent: true });
  const requestedEmail = body.recipientEmail?.trim().toLowerCase();
  if (requestedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(requestedEmail))
    return NextResponse.json({ error: 'أدخل بريداً إلكترونياً صالحاً.' }, { status: 400 });
  const recipientEmail = requestedEmail || user?.email;
  if (!user?.email && process.env.RESEND_ALLOW_GUEST_EMAIL !== 'true')
    return NextResponse.json({ error: 'إرسال الضيف غير متاح حالياً.' }, { status: 403 });
  if (!user?.email && !recipientEmail)
    return NextResponse.json({ error: 'أدخل بريداً إلكترونياً صالحاً.' }, { status: 400 });
  if (!user?.email && !allowGuestAttempt(request, recipientEmail!))
    return NextResponse.json({ error: 'تم بلوغ حد الإرسال المؤقت. حاول بعد ساعة.' }, { status: 429 });
  const usingResendTestSender = process.env.RESEND_FROM_EMAIL.includes('onboarding@resend.dev');
  const recipient = usingResendTestSender ? process.env.RESEND_TEST_RECIPIENT?.trim() : recipientEmail;
  if (!recipient)
    return NextResponse.json(
      { error: 'أضف بريد حساب Resend في RESEND_TEST_RECIPIENT لاختبار الإرسال.' },
      { status: 503 },
    );
  const content = body.pdfBase64?.replace(/^data:application\/pdf;base64,/, '') ?? '';
  if (!content || content.length > 12_000_000 || !/^[A-Za-z0-9+/=]+$/.test(content)) {
    return NextResponse.json({ error: 'ملف PDF غير صالح أو كبير جداً.' }, { status: 400 });
  }

  const internal = user ? await createInternalClient() : null;
  if (user && (!body.authorizationId || !/^[0-9a-f-]{36}$/i.test(body.authorizationId))) {
    return NextResponse.json({ error: 'يلزم تفويض التصدير قبل إرسال السيرة.' }, { status: 403 });
  }
  if (user && internal) {
    const { data: authorization, error: authorizationError } = await internal
      .from('resume_export_events')
      .select('id')
      .eq('id', body.authorizationId!)
      .eq('user_id', user.id)
      .eq('operation', 'email')
      .eq('status', 'authorized')
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();
    if (authorizationError || !authorization) {
      return NextResponse.json({ error: 'انتهت صلاحية تفويض الإرسال. أعد المحاولة.' }, { status: 403 });
    }
  }

  const english = body.language === 'en';
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: process.env.RESEND_FROM_EMAIL,
      to: [recipient],
      subject: english ? `${CV_PRODUCT_NAME} | Your CV is ready` : `${CV_PRODUCT_NAME} | سيرتك الذاتية جاهزة`,
      html: english
        ? `<div dir="ltr" style="font-family:Arial,sans-serif"><p style="font-weight:800">${CV_PRODUCT_NAME}</p><h2>Your CV is ready</h2><p>You will find the PDF copy attached to this email.</p></div>`
        : `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif"><p dir="ltr" style="font-family:Arial,sans-serif;font-weight:800">${CV_PRODUCT_NAME}</p><h2>سيرتك الذاتية جاهزة</h2><p>ستجد نسخة PDF مرفقة بهذه الرسالة.</p></div>`,
      attachments: [{ filename: `${sanitizeFilename(body.filename) || 'resume'}.pdf`, content }],
    }),
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Resend email failed', response.status, details);
    if (user && internal) {
      const { error: cancelError } = await internal.rpc('cancel_resume_email_export', {
        p_user_id: user.id,
        p_authorization_id: body.authorizationId!,
      });
      if (cancelError) console.error('Resume email export cancellation failed', cancelError);
    }
    return NextResponse.json({ error: 'تعذر إرسال البريد. تحقق من إعدادات Resend.' }, { status: 502 });
  }
  if (user && internal) {
    const { error: completionError } = await internal.rpc('complete_resume_email_export', {
      p_user_id: user.id,
      p_authorization_id: body.authorizationId!,
    });
    if (completionError) console.error('Completing resume email export failed', completionError);
  }
  return NextResponse.json({ sent: true, recipient });
}

function sanitizeFilename(value?: string) {
  return (value ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .slice(0, 80);
}

function allowGuestAttempt(request: Request, email: string) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const key = `${ip}:${email}`;
  const cutoff = Date.now() - 60 * 60 * 1000;
  const recent = (guestAttempts.get(key) ?? []).filter((time) => time > cutoff);
  if (recent.length >= 3) return false;
  guestAttempts.set(key, [...recent, Date.now()]);
  return true;
}
