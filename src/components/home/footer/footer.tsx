import Link from 'next/link';
import { useLocale } from '@/components/localization/locale-provider';
import { usePathname } from 'next/navigation';
import { BrandMark } from '@/components/brand/brand-mark';
import { BRAND_NAME, BRAND_TAGLINE } from '@/lib/brand';

export function Footer() {
  const { locale } = useLocale();
  const pathname = usePathname();
  const homePath = pathname === '/ar' || pathname === '/en' ? pathname : '/';
  return (
    <footer className="load-footer mt-16 border-t border-white/10">
      <div className="container flex flex-col gap-5 py-8 text-sm text-slate-400 md:flex-row md:items-center md:justify-between">
        <div className="footer-brand">
          <BrandMark className="h-10 w-10" />
          <div>
            <strong className="brand-wordmark text-white">{BRAND_NAME}</strong>
            <p className="mt-1">{BRAND_TAGLINE[locale]}</p>
          </div>
        </div>
        <nav className="flex flex-wrap gap-5" aria-label={locale === 'ar' ? 'روابط التذييل' : 'Footer links'}>
          <Link href={`${homePath}#pricing`} className="hover:text-white">
            {locale === 'ar' ? 'الباقات' : 'Pricing'}
          </Link>
          <Link href="/resume/new" className="hover:text-white">
            {locale === 'ar' ? 'ابنِ سيرتك' : 'Build your resume'}
          </Link>
          <a href="https://www.paddle.com/legal/privacy" className="hover:text-white">
            {locale === 'ar' ? 'الخصوصية' : 'Privacy'}
          </a>
          <a href="https://www.paddle.com/legal/terms" className="hover:text-white">
            {locale === 'ar' ? 'الشروط' : 'Terms'}
          </a>
        </nav>
        <p>
          © {new Date().getFullYear()} {BRAND_NAME}
        </p>
      </div>
    </footer>
  );
}
