import { ReactNode } from 'react';
import { DashboardLayout } from '@/components/dashboard/layout/dashboard-layout';
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import type { Metadata } from 'next';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Dashboard | ${BRAND_NAME}`,
  robots: { index: false, follow: false, nocache: true },
};

interface Props {
  children: ReactNode;
}

export default async function Layout({ children }: Props) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    redirect('/login');
  }
  return <DashboardLayout>{children}</DashboardLayout>;
}
