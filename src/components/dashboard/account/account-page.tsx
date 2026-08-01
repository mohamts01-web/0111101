'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CreditCard, KeyRound, Save, ShieldAlert, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { EffectiveEntitlement } from '@/lib/effective-entitlement';
import { useLocale } from '@/components/localization/locale-provider';

type DeletionRequest = { status: string; execute_after: string } | null;

const copy = {
  ar: {
    genericError: 'تعذر تنفيذ العملية.',
    saved: 'تم حفظ بيانات الحساب.',
    savedConfirmEmail: 'تم الحفظ. تحقق من بريدك لتأكيد العنوان الجديد.',
    saveError: 'تعذر الحفظ.',
    passwordSaved: 'تم تغيير كلمة المرور.',
    passwordError: 'تعذر تغيير كلمة المرور.',
    deleteConfirm: 'سيتم تقييد الحساب وجدولة حذفه بعد 7 أيام. هل تريد المتابعة؟',
    deleteScheduled: 'تمت جدولة حذف الحساب. يمكنك التراجع خلال 7 أيام.',
    deleteScheduleError: 'تعذر جدولة الحذف.',
    deleteCanceled: 'تم إلغاء حذف الحساب.',
    deleteCancelError: 'تعذر إلغاء الحذف.',
    eyebrow: 'إعدادات الحساب',
    title: 'حسابك واشتراكك',
    subtitle: 'حدّث بياناتك وراجع الباقة والرصيد وإعدادات الأمان.',
    deletionTitle: 'الحساب مجدول للحذف',
    deletionDate: 'موعد التنفيذ',
    cancelDeletion: 'إلغاء طلب الحذف',
    personal: 'البيانات الشخصية',
    name: 'الاسم',
    phone: 'رقم الهاتف',
    email: 'البريد الإلكتروني',
    save: 'حفظ البيانات',
    billing: 'الاشتراك والرصيد',
    plan: 'الباقة',
    accessSource: 'مصدر الوصول',
    credits: 'الرصيد',
    creditUnit: 'نقطة',
    paddleStatus: 'حالة Paddle',
    none: 'لا يوجد',
    portal: 'فتح بوابة الفوترة',
    portalUnavailable: 'ستتوفر بوابة الفوترة بعد أول عملية اشتراك.',
    security: 'الأمان',
    newPassword: 'كلمة مرور جديدة',
    passwordHint: '8 أحرف على الأقل',
    changePassword: 'تغيير كلمة المرور',
    deleteAccount: 'حذف الحساب',
    deleteDescription: 'توجد مهلة 7 أيام للتراجع. تُحفظ سجلات الفوترة اللازمة، وتُحذف بياناتك ومحتواك عند التنفيذ.',
    requestDeletion: 'طلب حذف الحساب',
  },
  en: {
    genericError: 'The operation could not be completed.',
    saved: 'Account details saved.',
    savedConfirmEmail: 'Saved. Check your inbox to confirm the new email address.',
    saveError: 'Your changes could not be saved.',
    passwordSaved: 'Password updated.',
    passwordError: 'Your password could not be updated.',
    deleteConfirm: 'Your account will be restricted and scheduled for deletion in 7 days. Continue?',
    deleteScheduled: 'Account deletion scheduled. You can cancel it within 7 days.',
    deleteScheduleError: 'Account deletion could not be scheduled.',
    deleteCanceled: 'Account deletion canceled.',
    deleteCancelError: 'The deletion request could not be canceled.',
    eyebrow: 'Account settings',
    title: 'Your account and plan',
    subtitle: 'Update your profile and review your plan, credits, and security settings.',
    deletionTitle: 'Account scheduled for deletion',
    deletionDate: 'Deletion date',
    cancelDeletion: 'Cancel deletion',
    personal: 'Personal details',
    name: 'Name',
    phone: 'Phone number',
    email: 'Email address',
    save: 'Save changes',
    billing: 'Plan and credits',
    plan: 'Plan',
    accessSource: 'Access source',
    credits: 'Credits',
    creditUnit: 'credits',
    paddleStatus: 'Paddle status',
    none: 'None',
    portal: 'Open billing portal',
    portalUnavailable: 'The billing portal becomes available after your first subscription.',
    security: 'Security',
    newPassword: 'New password',
    passwordHint: 'At least 8 characters',
    changePassword: 'Change password',
    deleteAccount: 'Delete account',
    deleteDescription:
      'You have 7 days to cancel. Required billing records are retained, while your content and personal data are deleted when the request is processed.',
    requestDeletion: 'Request account deletion',
  },
} as const;

export function AccountPage({
  email,
  initialName,
  initialPhone,
  entitlement,
  hasPaddleCustomer,
  initialDeletion,
}: {
  email: string;
  initialName: string;
  initialPhone: string;
  entitlement: EffectiveEntitlement;
  hasPaddleCustomer: boolean;
  initialDeletion: DeletionRequest;
}) {
  const { locale } = useLocale();
  const t = copy[locale];
  const [fullName, setFullName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [nextEmail, setNextEmail] = useState(email);
  const [password, setPassword] = useState('');
  const [deletion, setDeletion] = useState(initialDeletion);
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(url: string, method: string, body?: Record<string, string>) {
    setLoading(true);
    setStatus('');
    try {
      const response = await fetch(url, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = (await response.json()) as {
        error?: string;
        executeAfter?: string;
        emailConfirmationRequired?: boolean;
      };
      if (!response.ok) throw new Error(payload.error || t.genericError);
      return payload;
    } finally {
      setLoading(false);
    }
  }

  async function saveProfile() {
    try {
      const payload = await submit('/api/account', 'PATCH', { fullName, phone, email: nextEmail });
      setStatus(payload.emailConfirmationRequired ? t.savedConfirmEmail : t.saved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.saveError);
    }
  }

  async function savePassword() {
    try {
      await submit('/api/account/password', 'PATCH', { password });
      setPassword('');
      setStatus(t.passwordSaved);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.passwordError);
    }
  }

  async function requestDeletion() {
    if (!window.confirm(t.deleteConfirm)) return;
    try {
      const payload = await submit('/api/account/deletion', 'POST');
      setDeletion({ status: 'pending', execute_after: payload.executeAfter! });
      setStatus(t.deleteScheduled);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.deleteScheduleError);
    }
  }

  async function cancelDeletion() {
    try {
      await submit('/api/account/deletion', 'DELETE');
      setDeletion(null);
      setStatus(t.deleteCanceled);
    } catch (error) {
      setStatus(error instanceof Error ? error.message : t.deleteCancelError);
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 p-4 py-8 md:p-8">
      <header>
        <p className="resume-eyebrow">{t.eyebrow}</p>
        <h1 className="text-3xl font-bold">{t.title}</h1>
        <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
      </header>

      {deletion?.status === 'pending' && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-destructive/40 bg-destructive/5 p-4">
          <div>
            <strong>{t.deletionTitle}</strong>
            <p className="mt-1 text-sm text-muted-foreground">
              {t.deletionDate}:{' '}
              {new Date(deletion.execute_after).toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US')}
            </p>
          </div>
          <Button variant="outline" onClick={cancelDeletion} disabled={loading}>
            {t.cancelDeletion}
          </Button>
        </section>
      )}

      {status && (
        <p role="status" className="rounded-md border border-border bg-card p-3 text-sm">
          {status}
        </p>
      )}

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <UserRound className="h-5 w-5" />
            <h2 className="font-semibold">{t.personal}</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-name">{t.name}</Label>
            <Input
              id="account-name"
              value={fullName}
              onChange={(event) => setFullName(event.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-phone">{t.phone}</Label>
            <Input
              id="account-phone"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={locale === 'ar' ? '05xxxxxxxx' : '+966 5x xxx xxxx'}
              autoComplete="tel"
              dir="ltr"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-email">{t.email}</Label>
            <Input
              id="account-email"
              type="email"
              dir="ltr"
              value={nextEmail}
              onChange={(event) => setNextEmail(event.target.value)}
              autoComplete="email"
            />
          </div>
          <Button className="gap-2" onClick={saveProfile} disabled={loading}>
            <Save className="h-4 w-4" /> {t.save}
          </Button>
        </div>

        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            <h2 className="font-semibold">{t.billing}</h2>
          </div>
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <dt className="text-muted-foreground">{t.plan}</dt>
              <dd className="mt-1 font-semibold">{planLabel(entitlement.plan, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.accessSource}</dt>
              <dd className="mt-1 font-semibold">{sourceLabel(entitlement.source, locale)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.credits}</dt>
              <dd className="mt-1 font-semibold">
                {entitlement.totalCredits.toLocaleString(locale === 'ar' ? 'ar-SA' : 'en-US')} {t.creditUnit}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">{t.paddleStatus}</dt>
              <dd className="mt-1 font-semibold">
                {subscriptionStatusLabel(entitlement.subscriptionStatus, locale) ?? t.none}
              </dd>
            </div>
          </dl>
          {hasPaddleCustomer ? (
            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <a href="/api/customer-portal">{t.portal}</a>
              </Button>
              <Button asChild variant="outline">
                <Link href="/dashboard/subscriptions">
                  {locale === 'ar' ? 'إدارة أو إلغاء الاشتراك' : 'Manage or cancel subscription'}
                </Link>
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">{t.portalUnavailable}</p>
          )}
        </div>

        <div className="space-y-5 rounded-md border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <KeyRound className="h-5 w-5" />
            <h2 className="font-semibold">{t.security}</h2>
          </div>
          <div className="space-y-2">
            <Label htmlFor="account-password">{t.newPassword}</Label>
            <Input
              id="account-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={8}
              placeholder={t.passwordHint}
              autoComplete="new-password"
            />
          </div>
          <Button variant="outline" onClick={savePassword} disabled={loading || password.length < 8}>
            {t.changePassword}
          </Button>
        </div>

        <div className="space-y-5 rounded-md border border-destructive/35 bg-card p-6">
          <div className="flex items-center gap-2 text-destructive">
            <ShieldAlert className="h-5 w-5" />
            <h2 className="font-semibold">{t.deleteAccount}</h2>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">{t.deleteDescription}</p>
          <Button variant="destructive" onClick={requestDeletion} disabled={loading || deletion?.status === 'pending'}>
            {t.requestDeletion}
          </Button>
        </div>
      </section>
    </main>
  );
}

function planLabel(plan: EffectiveEntitlement['plan'], locale: 'ar' | 'en') {
  const labels =
    locale === 'ar'
      ? ({
          free: 'مجانية',
          trial_basic: 'التجريبية الأساسية',
          basic: 'الأساسية بلس',
          standard: 'متوسطة قديمة',
          advanced: 'متقدمة',
        } as const)
      : ({
          free: 'Free',
          trial_basic: 'Starter trial',
          basic: 'Basic Plus',
          standard: 'Legacy Pro',
          advanced: 'Advanced',
        } as const);
  return labels[plan];
}

function sourceLabel(source: EffectiveEntitlement['source'], locale: 'ar' | 'en') {
  const labels =
    locale === 'ar'
      ? ({
          free: 'مجاني',
          paddle: 'Paddle',
          admin: 'منحة إدارية',
          bank_transfer: 'تحويل بنكي',
          paddle_transaction: 'دفعة Paddle',
        } as const)
      : ({
          free: 'Free',
          paddle: 'Paddle',
          admin: 'Admin grant',
          bank_transfer: 'Bank transfer',
          paddle_transaction: 'Paddle payment',
        } as const);
  return labels[source];
}

function subscriptionStatusLabel(status: string | null, locale: 'ar' | 'en') {
  if (!status) return null;
  const labels: Record<string, { ar: string; en: string }> = {
    active: { ar: 'نشط', en: 'Active' },
    trialing: { ar: 'فترة تجريبية', en: 'Trialing' },
    past_due: { ar: 'دفعة متأخرة', en: 'Past due' },
    paused: { ar: 'متوقف مؤقتاً', en: 'Paused' },
    canceled: { ar: 'ملغي', en: 'Canceled' },
  };
  return labels[status]?.[locale] ?? status;
}
