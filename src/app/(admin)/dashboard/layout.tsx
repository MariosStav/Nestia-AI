export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <div data-theme="admin" className="min-h-screen bg-surface text-text">{children}</div>;
}