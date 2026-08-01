import type { Metadata } from 'next';
import { HomeRoute } from '@/components/home/home-route';
import { getHomeMetadata } from '@/lib/home-metadata';

export const metadata: Metadata = getHomeMetadata('ar', '/ar');

export default function ArabicHomePage() {
  return <HomeRoute locale="ar" />;
}
