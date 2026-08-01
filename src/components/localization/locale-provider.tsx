'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type AppLocale = 'ar' | 'en';

interface LocaleContextValue {
  locale: AppLocale;
  direction: 'rtl' | 'ltr';
  setLocale: (locale: AppLocale) => void;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

function applyLocale(locale: AppLocale) {
  document.documentElement.lang = locale === 'ar' ? 'ar-SA' : 'en';
  document.documentElement.dir = locale === 'ar' ? 'rtl' : 'ltr';
}

export function LocaleProvider({ children, initialLocale = 'ar' }: { children: ReactNode; initialLocale?: AppLocale }) {
  const [locale, setLocaleState] = useState<AppLocale>(initialLocale);

  const setLocale = useCallback((nextLocale: AppLocale) => {
    setLocaleState(nextLocale);
    applyLocale(nextLocale);
    localStorage.setItem('cv-locale', nextLocale);
    document.cookie = `cv-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  const toggleLocale = useCallback(() => {
    setLocaleState((currentLocale) => {
      const nextLocale: AppLocale = currentLocale === 'ar' ? 'en' : 'ar';
      applyLocale(nextLocale);
      localStorage.setItem('cv-locale', nextLocale);
      document.cookie = `cv-locale=${nextLocale}; path=/; max-age=31536000; samesite=lax`;
      return nextLocale;
    });
  }, []);

  useEffect(() => {
    setLocaleState(initialLocale);
    applyLocale(initialLocale);
    localStorage.setItem('cv-locale', initialLocale);
  }, [initialLocale]);

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      direction: locale === 'ar' ? 'rtl' : 'ltr',
      setLocale,
      toggleLocale,
    }),
    [locale, setLocale, toggleLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error('useLocale must be used inside LocaleProvider.');
  return context;
}
