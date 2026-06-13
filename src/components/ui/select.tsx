'use client';
import { useState, useRef, useEffect } from 'react';

type Option = { value: string; label: string };

export function Select({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Option[];
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={
          'flex w-full items-center justify-between rounded-input border border-border bg-white/80 ' +
          'px-4 py-3 text-left text-text transition-all duration-200 ' +
          'focus:outline-none focus:border-brand-bright focus:[box-shadow:var(--shadow-glow)]'
        }
      >
        <span>{selected?.label}</span>
        <span className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
      </button>

      {open && (
        <div className="animate-rise absolute z-20 mt-2 w-full overflow-hidden rounded-input border border-border bg-card [box-shadow:var(--shadow-glass)]">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => { onChange(o.value); setOpen(false); }}
              className={
                'block w-full px-4 py-3 text-left text-text transition-colors ' +
                (o.value === value ? 'bg-brand text-text-invert' : 'hover:bg-brand/10')
              }
            >
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}