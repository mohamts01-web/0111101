'use client';

import { login, loginAnonymously } from '@/app/login/actions';
import { AuthenticationForm } from '@/components/authentication/authentication-form';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useLocale } from '@/components/localization/locale-provider';

export function LoginForm() {
  const { locale } = useLocale();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const searchParams = useSearchParams();

  function handleLogin() {
    login({ email, password, next: searchParams.get('next') ?? undefined }).then((data) => {
      if (data?.error) {
        toast({
          description:
            locale === 'ar' ? 'البريد الإلكتروني أو كلمة المرور غير صحيحة.' : 'The email or password is incorrect.',
          variant: 'destructive',
        });
      }
    });
  }

  function handleAnonymousLogin() {
    loginAnonymously().then((data) => {
      if (data?.error) {
        toast({
          description:
            locale === 'ar'
              ? 'تعذّر الدخول كضيف حالياً. حاول مرة ثانية.'
              : 'Guest access is unavailable right now. Try again.',
          variant: 'destructive',
        });
      }
    });
  }

  return (
    <form action="#" className="flex flex-col items-center gap-6 px-6 py-8 md:px-10">
      <div className="text-center">
        <h1 className="text-2xl font-bold">{locale === 'ar' ? 'حيّاك من جديد' : 'Welcome back'}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {locale === 'ar' ? 'ادخل حسابك وكمّل سيرتك من مكانك.' : 'Sign in and continue working on your resumes.'}
        </p>
      </div>
      <Button onClick={handleAnonymousLogin} type="button" variant="outline" className="w-full">
        {locale === 'ar' ? 'جرّب كضيف' : 'Continue as guest'}
      </Button>
      <div className="flex w-full items-center justify-center">
        <Separator className="w-5/12 bg-border" />
        <div className="px-4 text-xs font-medium text-muted-foreground">{locale === 'ar' ? 'أو' : 'or'}</div>
        <Separator className="w-5/12 bg-border" />
      </div>
      <AuthenticationForm email={email} onEmailChange={setEmail} password={password} onPasswordChange={setPassword} />
      <Button formAction={handleLogin} type="submit" className="w-full">
        {locale === 'ar' ? 'ادخل حسابك' : 'Sign in'}
      </Button>
    </form>
  );
}
