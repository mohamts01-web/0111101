import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { BRAND_NAME } from '@/lib/brand';

export const metadata: Metadata = {
  title: `Checkout | ${BRAND_NAME}`,
  robots: { index: false, follow: false, nocache: true },
};

export default function CheckoutLayout({ children }: { children: ReactNode }) {
  return children;
}
