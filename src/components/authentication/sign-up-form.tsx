'use client';

import { AuthenticationForm } from '@/components/authentication/authentication-form';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { FormEvent, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/components/localization/locale-provider';

export function SignupForm() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [statusType, setStatusType] = useState<'success' | 'error'>('success');

  function handleSignup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setStatusMessage('');
    fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, locale, next: searchParams.get('next') }),
    })
      .then((response) => response.json())
      .then((data: { error?: boolean; message?: string; success?: boolean; redirectTo?: string }) => {
        if (data?.error) {
          const message =
            data.message ??
            (locale === 'ar'
              ? 'تعذّر إنشاء الحساب حالياً. حاول مرة ثانية.'
              : 'Could not create the account. Try again.');
          setStatusType('error');
          setStatusMessage(message);
          toast({ description: message, variant: 'destructive' });
          return;
        }
        if (data?.success) {
          const message =
            data.message ??
            (locale === 'ar'
              ? 'تم إنشاء الحساب بنجاح. تقدر تسجّل دخولك الآن.'
              : 'Your account was created successfully.');
          setStatusType('success');
          setStatusMessage(message);
          toast({ description: message });
          window.setTimeout(() => window.location.assign(data.redirectTo ?? '/login'), 800);
        }
      })
      .catch(() => {
        const message =
          locale === 'ar' ? 'تعذّر الاتصال بالخادم. حاول مرة ثانية.' : 'Could not reach the server. Try again.';
        setStatusType('error');
        setStatusMessage(message);
        toast({ description: message, variant: 'destructive' });
      })
      .finally(() => setLoading(false));
  }

  return (
    <form onSubmit={handleSignup} className="flex flex-col items-center gap-6 px-6 py-8 md:px-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{locale === 'ar' ? 'افتح حسابك' : 'Create your account'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === 'ar'
            ? 'احفظ سيرك وخطاباتك وخلّك جاهز لكل فرصة.'
            : 'Save your resumes and cover letters, ready for every opportunity.'}
        </p>
      </div>
      <AuthenticationForm email={email} onEmailChange={setEmail} password={password} onPasswordChange={setPassword} />
      <Button disabled={loading} type="submit" className="w-full">
        {loading
          ? locale === 'ar'
            ? 'جاري إنشاء الحساب...'
            : 'Creating account...'
          : locale === 'ar'
            ? 'إنشاء الحساب'
            : 'Create account'}
      </Button>
      {statusMessage && (
        <div
          className={`w-full text-center text-sm leading-5 ${statusType === 'success' ? 'text-primary' : 'text-destructive'}`}
        >
          {statusMessage}
        </div>
      )}
    </form>
  );
}
