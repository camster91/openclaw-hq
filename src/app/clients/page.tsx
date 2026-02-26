'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { SOURCES, CLIENT_STATUSES, PLATFORMS } from '@/lib/agents';
import Nav from '@/components/Nav';
import { Plus, X, Users, FolderOpen, AlertCircle, ChevronRight } from 'lucide-react';

type Client = {
  id: number; name: string; contact_name: string; contact_email: string;
  source: string; status: string; platform: string; notes: string;
  wp_login_url: string; shopify_store: string;
  created_at: string; updated_at: string;
  project_count: number; open_tasks: number; pending_comms: number;
};

function ClientCard({ client }: { client: Client }) {
  const statusInfo = CLIENT_STATUSES[client.status as keyof typeof CLIENT_STATUSES] || CLIENT_STATUSES.active;
  const sourceInfo = SOURCES[client.source as keyof typeof SOURCES] || SOURCES.other;
  const platformInfo = PLATFORMS[client.platform as keyof typeof PLATFORMS];

  return (
    <Link href={`/clients/${client.id}`}
      className="block rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 hover:bg-[var(--bg-card-hover)] hover:border-[var(--border-subtle)] transition-all group">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base">{client.name}</h3>
            {platformInfo && <span title={platformInfo.label}>{platformInfo.icon}</span>}
          </div>
          {client.contact_name && <p className="text-xs text-[var(--text-muted)] mt-0.5">{client.contact_name}</p>}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ background: statusInfo.color + '18', color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
            {statusInfo.label}
          </span>
          <ChevronRight size={16} className="text-[var(--text-muted)] group-hover:text-[var(--text-primary)] transition-colors" />
        </div>
      </div>

      <div className="flex items-center gap-4 text-xs mb-3">
        <span className="flex items-center gap-1.5 text-[var(--text-muted)]">
          <FolderOpen size={12} /> {client.project_count} projects
        </span>
        <span className={`flex items-center gap-1.5 ${client.open_tasks > 0 ? 'text-amber-400' : 'text-[var(--text-muted)]'}`}>
          <AlertCircle size={12} /> {client.open_tasks} open tasks
        </span>
        <span className="text-xs px-2 py-0.5 rounded-full"
          style={{ background: sourceInfo.color + '18', color: sourceInfo.color }}>
          {sourceInfo.label}
        </span>
      </div>

      {client.notes && (
        <p className="text-xs text-[var(--text-muted)] line-clamp-2">{client.notes}</p>
      )}
    </Link>
  );
}

function CreateClientModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    name: '', contact_name: '', contact_email: '', source: 'direct', status: 'active',
    platform: '', wp_login_url: '', shopify_store: '', notes: ''
  });
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch('/api/clients', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    setSaving(false);
    setForm({ name: '', contact_name: '', contact_email: '', source: 'direct', status: 'active', platform: '', wp_login_url: '', shopify_store: '', notes: '' });
    onCreated();
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">New Client</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Client Name</label>
            <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Company or person name" autoFocus />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Contact Name</label>
              <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.contact_name} onChange={e => setForm({ ...form, contact_name: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Contact Email</label>
              <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.contact_email} onChange={e => setForm({ ...form, contact_email: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Source</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
                {Object.entries(SOURCES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Platform</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })}>
                <option value="">None</option>
                {Object.entries(PLATFORMS).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Notes</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none h-20"
              value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <button type="submit" disabled={saving || !form.name.trim()}
            className="w-full py-2.5 rounded-lg font-medium text-sm bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Creating...' : 'Add Client'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchClients() {
    setLoading(true);
    try {
      const params = filterStatus !== 'all' ? `?status=${filterStatus}` : '';
      const res = await fetch(`/api/clients${params}`);
      const data = await res.json();
      setClients(Array.isArray(data) ? data : []);
    } catch { setClients([]); }
    setLoading(false);
  }

  useEffect(() => { fetchClients(); }, [filterStatus]);

  const activeClients = clients.filter(c => c.status === 'active');
  const otherClients = clients.filter(c => c.status !== 'active');

  return (
    <div className="min-h-screen">
      <Nav onRefresh={fetchClients} loading={loading} />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <Users size={22} /> Clients
            </h2>
            <p className="text-sm text-[var(--text-muted)]">{clients.length} clients · {activeClients.length} active</p>
          </div>
          <div className="flex items-center gap-3">
            <select className="text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5"
              value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="all">All Statuses</option>
              {Object.entries(CLIENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-black font-medium text-sm hover:opacity-90 transition-opacity">
              <Plus size={16} /> Add Client
            </button>
          </div>
        </div>

        {activeClients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">Active Clients</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeClients.map(c => <ClientCard key={c.id} client={c} />)}
            </div>
          </div>
        )}

        {otherClients.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-[var(--text-muted)] mb-3 uppercase tracking-wider">Other</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {otherClients.map(c => <ClientCard key={c.id} client={c} />)}
            </div>
          </div>
        )}
      </main>

      <CreateClientModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchClients} />
    </div>
  );
}
