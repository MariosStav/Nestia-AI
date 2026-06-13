import { type InputHTMLAttributes } from 'react';

export function Input({ className = '', ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={
        'w-full rounded-input border border-border bg-white/85 px-4 py-3 text-text ' +
        'placeholder:text-text-muted transition-all duration-200 ' +
        'focus:outline-none focus:border-brand-bright focus:[box-shadow:var(--shadow-glow)] ' +
        className
      }
      {...props}
    />
  );
}