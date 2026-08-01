import { headers } from 'next/headers';
import { HomePage } from '@/components/home/home-page';
import type { AppLocale } from '@/components/localization/locale-provider';
import { CV_PRODUCT_NAME } from '@/lib/brand';

const structuredCopy = {
  ar: {
    name: CV_PRODUCT_NAME,
    description: 'منصة لبناء وتحسين السير الذاتية بالعربية والإنجليزية وقياس توافقها مع أنظمة ATS.',
    features: [
      'بناء السيرة الذاتية',
      'فحص توافق ATS',
      'تحسين المحتوى بالذكاء الاصطناعي',
      'ترجمة السيرة الذاتية',
      'إنشاء خطاب تغطية',
    ],
  },
  en: {
    name: CV_PRODUCT_NAME,
    description: 'A bilingual resume builder for creating, improving, translating, and checking ATS compatibility.',
    features: [
      'Resume builder',
      'ATS compatibility check',
      'AI content improvement',
      'Resume translation',
      'Cover letter builder',
    ],
  },
} as const;

export async function HomeRoute({ locale }: { locale: AppLocale }) {
  const paddleEnvironment = process.env.NEXT_PUBLIC_PADDLE_ENV;
  const paddleToken = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;

  if (!paddleEnvironment || !['sandbox', 'production'].includes(paddleEnvironment)) {
    throw new Error('NEXT_PUBLIC_PADDLE_ENV must be explicitly set to sandbox or production.');
  }
  if (!paddleToken) throw new Error('NEXT_PUBLIC_PADDLE_CLIENT_TOKEN is required.');
  if (paddleEnvironment === 'sandbox' && !paddleToken.startsWith('test_')) {
    throw new Error('Paddle sandbox requires a client-side token prefixed with test_.');
  }

  const requestHeaders = await headers();
  const country = requestHeaders.get('x-vercel-ip-country') ?? undefined;
  const t = structuredCopy[locale];
  const baseUrl = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000').replace(/\/$/, '');
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: t.name,
    url: `${baseUrl}/${locale}`,
    applicationCategory: 'BusinessApplication',
    operatingSystem: 'Web',
    inLanguage: locale === 'ar' ? 'ar-SA' : 'en',
    availableLanguage: ['Arabic', 'English'],
    description: t.description,
    featureList: t.features,
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      <HomePage country={country} />
    </>
  );
}
