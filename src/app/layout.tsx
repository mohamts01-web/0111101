import { Inter, Readex_Pro } from 'next/font/google';
import '../styles/globals.css';
import '../styles/layout.css';
import { ReactNode } from 'react';
import type { Metadata } from 'next';
import { Toaster } from '@/components/ui/toaster';
import { LocaleProvider } from '@/components/localization/locale-provider';
import { getRequestLocale } from '@/lib/server-locale';
import { getHomeMetadata } from '@/lib/home-metadata';

const arabicFont = Readex_Pro({ subsets: ['arabic'], display: 'swap', variable: '--font-arabic' });
const latinFont = Inter({ subsets: ['latin'], display: 'swap', variable: '--font-latin' });

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getRequestLocale();
  return getHomeMetadata(locale, '/');
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  const locale = await getRequestLocale();

  return (
    <html
      lang={locale === 'ar' ? 'ar-SA' : 'en'}
      dir={locale === 'ar' ? 'rtl' : 'ltr'}
      className={`${arabicFont.variable} ${latinFont.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{const t=localStorage.getItem('cv-theme');const d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);document.documentElement.style.colorScheme=d?'dark':'light'}catch(e){}",
          }}
        />
      </head>
      <body>
        <LocaleProvider initialLocale={locale}>
          {children}
          <Toaster />
        </LocaleProvider>
      </body>
    </html>
  );
}
