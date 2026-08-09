'use client';

import Link from 'next/link';
import { Bell, CircleHelp, Coins, CreditCard, LogOut, Settings } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useUserInfo } from '@/hooks/useUserInfo';
import { useLocale } from '@/components/localization/locale-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type AccountSummary = {
  totalCredits?: number;
  plan?: string;
  status?: string;
};

export function SidebarUserInfo() {
  const { locale } = useLocale();
  const supabase = createClient();
  const { user } = useUserInfo(supabase);
  const [summary, setSummary] = useState<AccountSummary | null>(null);
  const ar = locale === 'ar';
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || (ar ? 'حسابي' : 'My account');
  const initial = String(displayName).trim().charAt(0).toUpperCase();
  const plan = summary?.plan || 'free';
  const planLabel = plan === 'free' ? (ar ? 'الخطة المجانية' : 'Free plan') : plan;
  const credits = new Intl.NumberFormat('en-US').format(summary?.totalCredits || 0);

  useEffect(() => {
    let active = true;
    void fetch('/api/credits')
      .then(async (response) => (response.ok ? ((await response.json()) as { entitlement?: AccountSummary }) : null))
      .then((payload) => {
        if (active && payload?.entitlement) setSummary(payload.entitlement);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    location.assign('/login');
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="dashboard-user-panel dashboard-user-trigger"
          aria-label={ar ? 'فتح قائمة الحساب' : 'Open account menu'}
        >
          <span className="dashboard-user-avatar">{initial}</span>
          <span className="dashboard-user-copy">
            <strong>{displayName}</strong>
            <small>{user?.email}</small>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="dashboard-account-menu" align={ar ? 'start' : 'end'} side="top">
        <DropdownMenuLabel>
          <strong>{planLabel}</strong>
          <span>{ar ? `${credits} نقطة متاحة` : `${credits} credits available`}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/dashboard/account">
            <Settings /> {ar ? 'الحساب والإعدادات' : 'Account settings'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/subscriptions">
            <CreditCard /> {ar ? 'إدارة أو إلغاء الاشتراك' : 'Manage subscription'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/credits">
            <Coins /> {ar ? 'شراء النقاط' : 'Buy credits'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/notifications">
            <Bell /> {ar ? 'الإشعارات' : 'Notifications'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/dashboard/support">
            <CircleHelp /> {ar ? 'الدعم والاقتراحات' : 'Support and feedback'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="dashboard-account-menu-signout" onSelect={() => void handleLogout()}>
          <LogOut /> {ar ? 'تسجيل الخروج' : 'Sign out'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
