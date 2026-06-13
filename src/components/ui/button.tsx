'use client';
import { type ButtonHTMLAttributes } from 'react';

type Variant = 'primary' | 'accent' | 'ghost';

const base =
  'inline-flex items-center justify-center gap-2 rounded-btn px-5 py-3 text-sm font-semibold ' +
  'transition-all duration-200 ease-out active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ' +
  'focus-visible:outline-none focus-visible:[box-shadow:var(--shadow-glow)]';

const variants: Record<Variant, string> = {
  primary: 'bg-brand text-text-invert hover:bg-brand-strong hover:-translate-y-0.5 shadow-soft',
  accent:
    'bg-accent text-accent-foreground hover:bg-accent-strong hover:-translate-y-0.5 ' +
    'hover:[box-shadow:var(--shadow-glow-accent)]',
  ghost: 'bg-transparent text-text-invert hover:bg-white/10',
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}