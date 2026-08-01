import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type SignupLocale = 'ar' | 'en';

function localizeSignupError(message: string, locale: SignupLocale) {
  const normalizedMessage = message.toLowerCase();

  if (normalizedMessage.includes('invalid')) {
    return locale === 'ar'
      ? 'البريد الإلكتروني غير صالح. استخدم بريداً حقيقياً مثل Gmail أو Outlook.'
      : 'The email address is invalid. Use a real address such as Gmail or Outlook.';
  }
  if (normalizedMessage.includes('already')) {
    return locale === 'ar'
      ? 'هذا البريد مسجل مسبقاً. جرّب تسجيل الدخول.'
      : 'This email is already registered. Try signing in.';
  }
  if (normalizedMessage.includes('rate limit')) {
    return locale === 'ar'
      ? 'تم تجاوز حد إرسال رسائل التسجيل مؤقتاً من Supabase. انتظر قليلاً ثم حاول مرة أخرى.'
      : 'The signup email limit was reached temporarily. Wait a little and try again.';
  }
  return message;
}

function canUseDevelopmentSignupFallback() {
  return (
    process.env.NODE_ENV !== 'production' &&
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY) &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('PASTE_') &&
    !process.env.SUPABASE_SERVICE_ROLE_KEY?.includes('placeholder')
  );
}

async function createConfirmedDevelopmentUser(email: string, password: string) {
  const adminSupabase = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );

  return adminSupabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
}

export async function POST(request: Request) {
  const body = (await request.json()) as { email?: string; password?: string; locale?: SignupLocale; next?: string };
  const locale: SignupLocale = body.locale === 'en' ? 'en' : 'ar';
  const next = body.next?.startsWith('/') && !body.next.startsWith('//') ? body.next : '/dashboard';

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('placeholder') ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.includes('PASTE_')
  ) {
    return NextResponse.json(
      {
        error: true,
        message:
          locale === 'ar'
            ? 'إعدادات Supabase غير مكتملة. أضف مفاتيح المشروع في ملف .env.local.'
            : 'Supabase is not configured. Add the project keys to .env.local.',
      },
      { status: 500 },
    );
  }

  const { email, password } = body;

  if (!email || !password) {
    return NextResponse.json(
      {
        error: true,
        message: locale === 'ar' ? 'أدخل البريد الإلكتروني وكلمة المرور.' : 'Enter your email address and password.',
      },
      { status: 400 },
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes('rate limit') && canUseDevelopmentSignupFallback()) {
      const { error: adminError } = await createConfirmedDevelopmentUser(email, password);

      if (!adminError) {
        const { error: loginError } = await supabase.auth.signInWithPassword({ email, password });

        if (loginError) {
          return NextResponse.json(
            { error: true, message: localizeSignupError(loginError.message, locale) },
            { status: 400 },
          );
        }

        return NextResponse.json({
          success: true,
          message:
            locale === 'ar'
              ? 'تم إنشاء الحساب وتسجيل الدخول في وضع التطوير بدون إرسال بريد تأكيد.'
              : 'The account was created and signed in using development mode without a confirmation email.',
          redirectTo: next,
        });
      }

      return NextResponse.json(
        { error: true, message: localizeSignupError(adminError.message, locale) },
        { status: 400 },
      );
    }

    return NextResponse.json({ error: true, message: localizeSignupError(error.message, locale) }, { status: 400 });
  }

  if (data.session) {
    return NextResponse.json({
      success: true,
      message:
        locale === 'ar'
          ? 'تم إنشاء الحساب وتسجيل الدخول بنجاح.'
          : 'Your account was created and signed in successfully.',
      redirectTo: next,
    });
  }

  return NextResponse.json({
    success: true,
    message:
      locale === 'ar'
        ? 'تم إنشاء الحساب. تحقق من بريدك الإلكتروني لإكمال التفعيل.'
        : 'Your account was created. Check your email to complete verification.',
    redirectTo: `/login?next=${encodeURIComponent(next)}`,
  });
}
