'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { AGENTS, STATUSES, PRIORITIES, CATEGORIES, CLIENT_STATUSES, PROJECT_TYPES, SOURCES, PLATFORMS } from '@/lib/agents';
import Nav from '@/components/Nav';
import {
  ArrowLeft, Plus, X, FolderOpen, Play, CheckCircle2,
  AlertTriangle, MessageCircleQuestion, ChevronDown, FileText, Send
} from 'lucide-react';

type Client = {
  id: number; name: string; contact_name: string; contact_email: string;
  source: string; status: string; platform: string; notes: string;
  wp_login_url: string; wp_username: string; shopify_store: string; hosting_info: string;
  monthly_retainer: number; created_at: string; updated_at: string;
};

type Project = {
  id: number; client_id: number; name: string; description: string;
  status: string; project_type: string; budget: number;
  hours_estimated: number; hours_used: number;
  created_at: string; updated_at: string;
};

type Task = {
  id: number; title: string; description: string;
  status: string; priority: string; agent: string; category: string;
  requirements: string; agent_questions: string; agent_output: string;
  dispatch_count: number; last_dispatched_at: string | null;
  project_id: number | null; client_name?: string;
  created_at: string; updated_at: string;
};

type Comm = {
  id: number; channel: string; direction: string; subject: string;
  summary: string; from_name: string; action_needed: number; created_at: string;
};

function CreateProjectModal({ open, onClose, onCreated, clientId }: {
  open: boolean; onClose: () => void; onCreated: () => void; clientId: number;
}) {
  const [form, setForm] = useState({ name: '', description: '', project_type: 'other', budget: '', hours_estimated: '' });
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    await fetch('/api/projects', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_id: clientId, budget: Number(form.budget) || 0, hours_estimated: Number(form.hours_estimated) || 0 }),
    });
    setSaving(false);
    setForm({ name: '', description: '', project_type: 'other', budget: '', hours_estimated: '' });
    onCreated(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 p-6 animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">New Project</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Project Name</label>
            <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none h-20"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Type</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.project_type} onChange={e => setForm({ ...form, project_type: e.target.value })}>
                {Object.entries(PROJECT_TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Budget ($)</label>
              <input type="number" className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Hours Est.</label>
              <input type="number" className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.hours_estimated} onChange={e => setForm({ ...form, hours_estimated: e.target.value })} />
            </div>
          </div>
          <button type="submit" disabled={saving || !form.name.trim()}
            className="w-full py-2.5 rounded-lg font-medium text-sm bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40">
            {saving ? 'Creating...' : 'Create Project'}
          </button>
        </form>
      </div>
    </div>
  );
}

function CreateTaskModal({ open, onClose, onCreated, clientId, projects }: {
  open: boolean; onClose: () => void; onCreated: () => void; clientId: number; projects: Project[];
}) {
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', agent: 'unassigned', category: 'general', project_id: '', requirements: '' });
  const [saving, setSaving] = useState(false);
  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, client_id: clientId, project_id: form.project_id ? Number(form.project_id) : null }),
    });
    setSaving(false);
    setForm({ title: '', description: '', priority: 'medium', agent: 'unassigned', category: 'general', project_id: '', requirements: '' });
    onCreated(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl w-full max-w-lg mx-4 p-6 animate-fade-in max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold">New Task</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--bg-card-hover)] text-[var(--text-muted)]"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Title</label>
            <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} autoFocus />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none h-20"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Project</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No Project</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Assign To</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
                {Object.values(AGENTS).map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Priority</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Category</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Requirements / Context</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] resize-none h-20"
              value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} />
          </div>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="w-full py-2.5 rounded-lg font-medium text-sm bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

function TaskItem({ task, onDispatch }: { task: Task; onDispatch: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const s = STATUSES[task.status as keyof typeof STATUSES] || STATUSES.queued;
  const p = PRIORITIES[task.priority as keyof typeof PRIORITIES] || PRIORITIES.medium;
  const a = AGENTS[task.agent as keyof typeof AGENTS] || AGENTS.unassigned;

  return (
    <div className={`border rounded-lg bg-[var(--bg-card)] transition-all ${task.status === 'needs_info' ? 'border-purple-500/40' : 'border-[var(--border)]'}`}>
      <div className="flex items-center gap-3 px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        {task.status === 'queued' && task.agent !== 'unassigned' ? (
          <button onClick={e => { e.stopPropagation(); onDispatch(task.id); }}
            className="w-6 h-6 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 shrink-0"
            title="Start task">
            <Play size={10} fill="currentColor" />
          </button>
        ) : (
          <span className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0"
            style={{ borderColor: s.color, color: s.color }}>
            {task.status === 'done' && <CheckCircle2 size={12} />}
            {task.status === 'needs_info' && <MessageCircleQuestion size={12} />}
            {task.status === 'in_progress' && <span className="w-2 h-2 rounded-full pulse-dot" style={{ background: s.color }} />}
            {task.status === 'blocked' && <AlertTriangle size={10} />}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <span className={`text-sm font-medium ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>{task.title}</span>
        </div>
        <span className="text-xs" style={{ color: p.color }}>{p.label}</span>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: a.color + '18', color: a.color }}>{a.emoji} {a.name}</span>
        <ChevronDown size={14} className={`text-[var(--text-muted)] transition-transform ${expanded ? 'rotate-180' : ''}`} />
      </div>
      {expanded && (
        <div className="px-4 pb-3 pt-1 border-t border-[var(--border-subtle)] space-y-2 text-xs animate-fade-in">
          {task.description && <p className="text-[var(--text-secondary)]">{task.description}</p>}
          {task.requirements && (
            <div className="bg-[var(--bg-secondary)] rounded-lg p-2">
              <span className="text-[var(--text-muted)] font-medium flex items-center gap-1 mb-1"><FileText size={10} /> Requirements</span>
              <p className="text-[var(--text-secondary)] whitespace-pre-wrap">{task.requirements}</p>
            </div>
          )}
          {task.agent_questions && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
              <span className="text-purple-400 font-medium flex items-center gap-1 mb-1"><MessageCircleQuestion size={10} /> Agent Questions</span>
              <p className="text-purple-300 whitespace-pre-wrap">{task.agent_questions}</p>
            </div>
          )}
          {task.agent_output && (
            <details className="bg-[var(--bg-secondary)] rounded-lg">
              <summary className="px-2 py-1 text-[var(--text-muted)] cursor-pointer">Agent Output</summary>
              <pre className="px-2 pb-2 text-[var(--text-secondary)] whitespace-pre-wrap max-h-40 overflow-y-auto">{task.agent_output}</pre>
            </details>
          )}
        </div>
      )}
    </div>
  );
}

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [comms, setComms] = useState<Comm[]>([]);
  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewTask, setShowNewTask] = useState(false);
  const [loading, setLoading] = useState(true);

  async function fetchData() {
    setLoading(true);
    const res = await fetch(`/api/clients/${id}`);
    if (res.ok) {
      const data = await res.json();
      setClient(data.client);
      setProjects(data.projects);
      setTasks(data.tasks);
      setComms(data.comms);
    }
    setLoading(false);
  }

  useEffect(() => { fetchData(); }, [id]);

  async function dispatchTask(taskId: number) {
    await fetch(`/api/tasks/${taskId}/dispatch`, { method: 'POST' });
    fetchData();
  }

  if (loading && !client) return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-[1600px] mx-auto px-6 py-12 text-center text-[var(--text-muted)]">Loading...</div>
    </div>
  );

  if (!client) return (
    <div className="min-h-screen">
      <Nav />
      <div className="max-w-[1600px] mx-auto px-6 py-12 text-center text-[var(--text-muted)]">Client not found</div>
    </div>
  );

  const statusInfo = CLIENT_STATUSES[client.status as keyof typeof CLIENT_STATUSES] || CLIENT_STATUSES.active;
  const sourceInfo = SOURCES[client.source as keyof typeof SOURCES] || SOURCES.other;

  return (
    <div className="min-h-screen">
      <Nav onRefresh={fetchData} loading={loading} />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Breadcrumb + header */}
        <div>
          <Link href="/clients" className="text-xs text-[var(--accent)] hover:underline flex items-center gap-1 mb-3">
            <ArrowLeft size={12} /> Back to Clients
          </Link>
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-2xl font-bold">{client.name}</h2>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                  style={{ background: statusInfo.color + '18', color: statusInfo.color, border: `1px solid ${statusInfo.color}30` }}>
                  {statusInfo.label}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: sourceInfo.color + '18', color: sourceInfo.color }}>
                  {sourceInfo.label}
                </span>
              </div>
              {client.contact_name && <p className="text-sm text-[var(--text-muted)] mt-1">{client.contact_name} {client.contact_email && `· ${client.contact_email}`}</p>}
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowNewProject(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-[var(--border)] text-sm hover:bg-[var(--bg-card)] transition-colors">
                <FolderOpen size={14} /> New Project
              </button>
              <button onClick={() => setShowNewTask(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black font-medium text-sm hover:opacity-90">
                <Plus size={14} /> New Task
              </button>
            </div>
          </div>
        </div>

        {/* Client info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="col-span-2 border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-5 space-y-3">
            <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider">Details</h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {client.platform && <div><span className="text-[var(--text-muted)]">Platform:</span> <span className="ml-2">{PLATFORMS[client.platform as keyof typeof PLATFORMS]?.label || client.platform}</span></div>}
              {client.wp_login_url && <div><span className="text-[var(--text-muted)]">WP Login:</span> <span className="ml-2 text-[var(--accent)]">{client.wp_login_url}</span></div>}
              {client.shopify_store && <div><span className="text-[var(--text-muted)]">Shopify:</span> <span className="ml-2">{client.shopify_store}</span></div>}
              {client.monthly_retainer > 0 && <div><span className="text-[var(--text-muted)]">Retainer:</span> <span className="ml-2">${client.monthly_retainer}/mo</span></div>}
            </div>
            {client.notes && <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap mt-2">{client.notes}</p>}
          </div>
          <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-5">
            <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-3">Summary</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Projects</span><span className="font-medium">{projects.length}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Open Tasks</span><span className="font-medium text-amber-400">{tasks.filter(t => t.status !== 'done').length}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Completed</span><span className="font-medium text-emerald-400">{tasks.filter(t => t.status === 'done').length}</span></div>
              <div className="flex justify-between"><span className="text-[var(--text-muted)]">Communications</span><span className="font-medium">{comms.length}</span></div>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div>
          <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-3 flex items-center gap-2">
            <FolderOpen size={14} /> Projects ({projects.length})
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => {
              const typeInfo = PROJECT_TYPES[p.project_type as keyof typeof PROJECT_TYPES] || PROJECT_TYPES.other;
              const projectTasks = tasks.filter(t => t.project_id === p.id);
              const openTasks = projectTasks.filter(t => t.status !== 'done');
              return (
                <div key={p.id} className="border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-sm">{p.name}</h4>
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: typeInfo.color + '18', color: typeInfo.color }}>{typeInfo.label}</span>
                  </div>
                  {p.description && <p className="text-xs text-[var(--text-muted)] mb-2 line-clamp-2">{p.description}</p>}
                  <div className="flex gap-3 text-xs text-[var(--text-muted)]">
                    <span>{projectTasks.length} tasks</span>
                    {openTasks.length > 0 && <span className="text-amber-400">{openTasks.length} open</span>}
                    {p.budget > 0 && <span>${p.budget}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tasks */}
        <div>
          <h3 className="font-bold text-sm text-[var(--text-muted)] uppercase tracking-wider mb-3">
            Tasks ({tasks.length})
          </h3>
          <div className="space-y-2">
            {tasks.map(t => <TaskItem key={t.id} task={t} onDispatch={dispatchTask} />)}
            {tasks.length === 0 && (
              <p className="text-sm text-[var(--text-muted)] py-8 text-center">No tasks for this client yet</p>
            )}
          </div>
        </div>
      </main>

      <CreateProjectModal open={showNewProject} onClose={() => setShowNewProject(false)} onCreated={fetchData} clientId={Number(id)} />
      <CreateTaskModal open={showNewTask} onClose={() => setShowNewTask(false)} onCreated={fetchData} clientId={Number(id)} projects={projects} />
    </div>
  );
}
