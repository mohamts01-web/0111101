import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ReactNode } from 'react';
import { LayoutDashboard, ShieldCheck } from 'lucide-react';
import { getAdminUser } from '@/lib/admin-auth';
import type { Metadata } from 'next';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Administration | ${BRAND_NAME}`,
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getAdminUser();
  if (!admin) redirect('/dashboard');
  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <header className="border-b bg-card">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-8">
          <div className="flex items-center gap-3 font-bold">
            <BrandMark className="h-10 w-10" />
            <span className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" /> إدارة{' '}
              <span className="brand-wordmark">{BRAND_NAME}</span>
            </span>
          </div>
          <Link
            href="/dashboard"
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboard className="h-4 w-4" /> لوحة المستخدم
          </Link>
        </div>
      </header>
      {children}
    </div>
  );
}
