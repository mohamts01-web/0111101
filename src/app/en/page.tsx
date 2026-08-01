import type { Metadata } from 'next';
import { HomeRoute } from '@/components/home/home-route';
import { getHomeMetadata } from '@/lib/home-metadata';

export const metadata: Metadata = getHomeMetadata('en', '/en');

export default function EnglishHomePage() {
  return <HomeRoute locale="en" />;
}
