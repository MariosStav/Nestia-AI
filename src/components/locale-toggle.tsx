'use client';
import { useI18n } from '@/lib/i18n/context';
import { LOCALES } from '@/lib/i18n/dictionaries';

export function LocaleToggle() {
  const { locale, setLocale } = useI18n();
  return (
    <div className="flex gap-1 text-sm">
      {LOCALES.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={`rounded px-2 py-1 ${locale === l ? 'bg-black text-white' : 'text-gray-500'}`}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}