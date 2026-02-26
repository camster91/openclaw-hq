'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { PROJECT_TYPES } from '@/lib/agents';
import Nav from '@/components/Nav';
import { FolderOpen } from 'lucide-react';

type Project = {
  id: number; client_id: number; name: string; description: string;
  status: string; project_type: string; budget: number;
  hours_estimated: number; hours_used: number;
  client_name: string; task_count: number; open_tasks: number;
  created_at: string;
};

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  async function fetchProjects() {
    setLoading(true);
    const res = await fetch('/api/projects');
    setProjects(await res.json());
    setLoading(false);
  }

  useEffect(() => { fetchProjects(); }, []);

  const active = projects.filter(p => p.status === 'active');
  const other = projects.filter(p => p.status !== 'active');

  return (
    <div className="min-h-screen">
      <Nav onRefresh={fetchProjects} loading={loading} />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><FolderOpen size={22} /> Projects</h2>
          <p className="text-sm text-[var(--text-muted)]">{projects.length} projects · {active.length} active</p>
        </div>

        {active.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">Active</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {active.map(p => {
                const typeInfo = PROJECT_TYPES[p.project_type as keyof typeof PROJECT_TYPES] || PROJECT_TYPES.other;
                return (
                  <Link key={p.id} href={`/clients/${p.client_id}`}
                    className="block border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-5 hover:bg-[var(--bg-card-hover)] transition-all">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-bold text-sm">{p.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>{typeInfo.label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mb-3">{p.client_name}</p>
                    {p.description && <p className="text-xs text-[var(--text-secondary)] mb-3 line-clamp-2">{p.description}</p>}
                    <div className="flex gap-4 text-xs text-[var(--text-muted)]">
                      <span>{p.task_count} tasks</span>
                      {p.open_tasks > 0 && <span className="text-amber-400">{p.open_tasks} open</span>}
                      {p.budget > 0 && <span>${p.budget}</span>}
                      {p.hours_estimated > 0 && <span>{p.hours_used}/{p.hours_estimated}h</span>}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {other.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">Other</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {other.map(p => {
                const typeInfo = PROJECT_TYPES[p.project_type as keyof typeof PROJECT_TYPES] || PROJECT_TYPES.other;
                return (
                  <Link key={p.id} href={`/clients/${p.client_id}`}
                    className="block border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-card-hover)] transition-all opacity-60">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-sm">{p.name}</h4>
                      <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>{typeInfo.label}</span>
                    </div>
                    <p className="text-xs text-[var(--text-muted)]">{p.client_name} · {p.task_count} tasks</p>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
