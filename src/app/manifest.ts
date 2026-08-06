import type { MetadataRoute } from 'next';
import { BRAND_NAME, CV_PRODUCT_NAME } from '@/lib/brand';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${CV_PRODUCT_NAME} | ${BRAND_NAME}`,
    short_name: BRAND_NAME,
    description: 'منصة ثنائية اللغة لبناء وتحسين السيرة الذاتية وفحص توافق ATS.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1d1d1d',
    icons: [
      {
        src: '/brand/platform-mark.png',
        sizes: '4096x4096',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    lang: 'ar-SA',
    dir: 'rtl',
  };
}
