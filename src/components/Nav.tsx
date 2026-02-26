'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutGrid, Users, FolderOpen, MessageSquare, RefreshCw } from 'lucide-react';

const links = [
  { href: '/', label: 'Dashboard', icon: LayoutGrid },
  { href: '/clients', label: 'Clients', icon: Users },
  { href: '/projects', label: 'Projects', icon: FolderOpen },
];

export default function Nav({ onRefresh, loading, gateway }: {
  onRefresh?: () => void;
  loading?: boolean;
  gateway?: { status: string };
}) {
  const pathname = usePathname();

  return (
    <header className="border-b border-[var(--border)] bg-[var(--bg-secondary)]/80 backdrop-blur-md sticky top-0 z-40">
      <div className="max-w-[1600px] mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
            <span className="text-2xl">🦞</span>
            <div>
              <h1 className="text-lg font-bold tracking-tight">OpenClaw HQ</h1>
              <p className="text-xs text-[var(--text-muted)]">Ashbi Design · Agent Dashboard</p>
            </div>
          </Link>

          <nav className="flex items-center gap-1 ml-4">
            {links.map(l => {
              const active = l.href === '/' ? pathname === '/' : pathname.startsWith(l.href);
              return (
                <Link key={l.href} href={l.href}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm transition-colors ${
                    active ? 'bg-[var(--accent)]/15 text-[var(--accent)]' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card)]'
                  }`}>
                  <l.icon size={15} />
                  {l.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {gateway && (
            <div className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-full border border-[var(--border)]">
              <span className={`w-2 h-2 rounded-full ${gateway.status === 'running' ? 'bg-emerald-400 pulse-dot' : gateway.status === 'checking' ? 'bg-yellow-400 pulse-dot' : 'bg-red-400'}`} />
              <span className="text-[var(--text-secondary)]">Gateway {gateway.status}</span>
            </div>
          )}
          {onRefresh && (
            <button onClick={onRefresh}
              className="p-2 rounded-lg border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors"
              title="Refresh">
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
