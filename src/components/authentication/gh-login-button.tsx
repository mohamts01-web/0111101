'use client';

import { signInWithGithub } from '@/app/login/actions';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Github } from 'lucide-react';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  label: string;
}

export function GhLoginButton({ label }: Props) {
  const { locale } = useLocale();
  return (
    <div className="flex flex-col items-center gap-5 px-6 pb-6 md:px-10">
      <div className="flex w-full items-center justify-center">
        <Separator className="w-5/12 bg-border" />
        <div className="px-4 text-xs font-medium text-muted-foreground">{locale === 'ar' ? 'أو' : 'or'}</div>
        <Separator className="w-5/12 bg-border" />
      </div>
      <Button onClick={() => signInWithGithub()} variant="outline" className="w-full">
        <Github className="h-5 w-5" />
        {label}
      </Button>
    </div>
  );
}
