import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Sign in | ${BRAND_NAME}`,
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: ReactNode }) {
  return children;
}
