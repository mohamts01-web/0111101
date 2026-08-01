import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useLocale } from '@/components/localization/locale-provider';

interface Props {
  email: string;
  password: string;
  onEmailChange: (email: string) => void;
  onPasswordChange: (password: string) => void;
}

export function AuthenticationForm({ email, onEmailChange, onPasswordChange, password }: Props) {
  const { locale } = useLocale();
  return (
    <>
      <div className="grid w-full max-w-sm items-center gap-1.5 mt-2">
        <Label className={'text-muted-foreground leading-5'} htmlFor="email">
          {locale === 'ar' ? 'البريد الإلكتروني' : 'Email address'}
        </Label>
        <Input
          className="h-11 rounded-md border-input bg-background"
          type="email"
          id="email"
          autoComplete={'username'}
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
        />
      </div>
      <div className="grid w-full max-w-sm items-center gap-1.5">
        <Label className={'text-muted-foreground leading-5'} htmlFor="password">
          {locale === 'ar' ? 'كلمة المرور' : 'Password'}
        </Label>
        <Input
          className="h-11 rounded-md border-input bg-background"
          type="password"
          id="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => onPasswordChange(e.target.value)}
        />
      </div>
    </>
  );
}
