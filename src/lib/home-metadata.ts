import type { Metadata } from 'next';
import type { AppLocale } from '@/components/localization/locale-provider';
import { BRAND_NAME, CV_PRODUCT_NAME } from '@/lib/brand';

const siteUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://127.0.0.1:3000';

const metadataCopy = {
  ar: {
    title: `${CV_PRODUCT_NAME} | أنشئ سيرة ذاتية احترافية ومتوافقة مع ATS`,
    description:
      'أنشئ سيرتك الذاتية بالعربية أو الإنجليزية، حسّنها بالذكاء الاصطناعي، افحص توافق ATS، وحمّل PDF احترافياً جاهزاً للتقديم.',
    keywords: [
      'إنشاء سيرة ذاتية',
      'سيرة ذاتية احترافية',
      'قوالب سيرة ذاتية',
      'فحص ATS',
      'تحسين السيرة الذاتية',
      'خطاب تغطية',
      'وظائف السعودية',
      'CV عربي',
    ],
    siteName: BRAND_NAME,
  },
  en: {
    title: `${CV_PRODUCT_NAME} | Professional ATS-Friendly Resume Builder`,
    description:
      'Build a professional resume in Arabic or English, improve it with AI, check ATS compatibility, and export a polished PDF ready for applications.',
    keywords: [
      'resume builder',
      'professional resume',
      'ATS resume checker',
      'AI resume builder',
      'resume templates',
      'cover letter builder',
      'Arabic resume builder',
      'CV maker',
    ],
    siteName: BRAND_NAME,
  },
} as const;

export function getHomeMetadata(locale: AppLocale, canonicalPath: '/' | '/ar' | '/en'): Metadata {
  const t = metadataCopy[locale];
  return {
    metadataBase: new URL(siteUrl),
    title: { absolute: t.title },
    description: t.description,
    keywords: [...t.keywords],
    applicationName: t.siteName,
    category: 'business',
    icons: {
      icon: [{ url: '/brand/platform-mark.png', type: 'image/png' }],
      shortcut: ['/brand/platform-mark.png'],
      apple: [{ url: '/brand/platform-mark.png', type: 'image/png' }],
    },
    alternates: {
      canonical: canonicalPath,
      languages: {
        'ar-SA': '/ar',
        en: '/en',
        'x-default': '/',
      },
    },
    openGraph: {
      type: 'website',
      locale: locale === 'ar' ? 'ar_SA' : 'en_US',
      alternateLocale: locale === 'ar' ? ['en_US'] : ['ar_SA'],
      url: canonicalPath,
      siteName: t.siteName,
      title: t.title,
      description: t.description,
      images: [{ url: '/brand/platform-mark.png', width: 4096, height: 4096, alt: t.siteName }],
    },
    twitter: {
      card: 'summary_large_image',
      title: t.title,
      description: t.description,
      images: ['/brand/platform-mark.png'],
    },
    robots: {
      index: true,
      follow: true,
      googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
    },
  };
}
