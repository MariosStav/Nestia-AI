export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={
        'rounded-card border border-white/15 bg-glass p-6 text-text ' +
        '[backdrop-filter:blur(12px)] [box-shadow:var(--shadow-glass)] ' +
        className
      }
    >
      {children}
    </div>
  );
}