'use client';
import { createContext, useContext, useEffect, useState } from 'react';
import { dictionaries, detectLocale, DEFAULT_LOCALE, type Locale, type Dictionary } from './dictionaries';

type I18nValue = { locale: Locale; t: Dictionary; setLocale: (l: Locale) => void };
const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ children, initialLocale }: { children: React.ReactNode; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);

  useEffect(() => {
    if (!initialLocale) setLocale(detectLocale());
  }, [initialLocale]);

  return (
    <I18nContext.Provider value={{ locale, t: dictionaries[locale], setLocale }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used within I18nProvider');
  return ctx;
}