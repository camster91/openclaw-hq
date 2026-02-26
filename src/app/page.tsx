'use client';

import { useState, useEffect, useCallback } from 'react';
import { AGENTS, STATUSES, PRIORITIES, CATEGORIES } from '@/lib/agents';
import Nav from '@/components/Nav';
import {
  Plus, X, ChevronDown, Zap, Clock, CheckCircle2,
  AlertTriangle, LayoutGrid, List, Filter, Activity, Play,
  MessageCircleQuestion, Send, FileText
} from 'lucide-react';

type Task = {
  id: number; title: string; description: string;
  status: 'queued' | 'in_progress' | 'needs_info' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  agent: keyof typeof AGENTS; category: string;
  client_id: number | null; project_id: number | null;
  due_date: string | null; created_at: string;
  updated_at: string; completed_at: string | null; notes: string;
  requirements: string; agent_questions: string; agent_output: string;
  dispatch_count: number; last_dispatched_at: string | null;
  client_name?: string; project_name?: string;
};

type ClientOption = { id: number; name: string };
type ProjectOption = { id: number; name: string; client_id: number };

type Stats = {
  total: number;
  byStatus: Record<string, number>;
  byAgent: { agent: string; total: number; done: number; in_progress: number; queued: number; blocked: number; needs_info: number }[];
  byPriority: Record<string, number>;
  recentActivity: { id: number; task_id: number; agent: string; action: string; detail: string; created_at: string; task_title: string }[];
  needsInfoTasks: { id: number; title: string; agent: string; agent_questions: string; client_name: string }[];
};

// ── Stat Card ──
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-5 flex items-center gap-4 hover:border-[var(--border-subtle)] transition-colors">
      <div className="w-11 h-11 rounded-lg flex items-center justify-center" style={{ background: color + '18', color }}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        <div className="text-sm text-[var(--text-muted)]">{label}</div>
      </div>
    </div>
  );
}

// ── Agent Badge ──
function AgentBadge({ agentId, size = 'sm' }: { agentId: keyof typeof AGENTS; size?: 'sm' | 'md' }) {
  const a = AGENTS[agentId] || AGENTS.unassigned;
  const sz = size === 'md' ? 'text-base px-3 py-1.5' : 'text-xs px-2 py-1';
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sz}`}
      style={{ background: a.color + '18', color: a.color, border: `1px solid ${a.color}30` }}>
      <span>{a.emoji}</span>
      <span>{a.name}</span>
    </span>
  );
}

// ── Status Badge ──
function StatusBadge({ status }: { status: keyof typeof STATUSES }) {
  const s = STATUSES[status];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full font-medium"
      style={{ background: s.color + '18', color: s.color, border: `1px solid ${s.color}30` }}>
      <span>{s.icon}</span>
      <span>{s.label}</span>
    </span>
  );
}

// ── Priority Dot ──
function PriorityDot({ priority }: { priority: keyof typeof PRIORITIES }) {
  const p = PRIORITIES[priority];
  return (
    <span className="inline-flex items-center gap-1.5 text-xs" style={{ color: p.color }}>
      <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
      {p.label}
    </span>
  );
}

// ── Needs Info Banner ──
function NeedsInfoBanner({ tasks, onAnswer }: {
  tasks: { id: number; title: string; agent: string; agent_questions: string; client_name: string }[];
  onAnswer: (id: number, requirements: string) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  if (tasks.length === 0) return null;

  return (
    <div className="rounded-xl border-2 border-purple-500/30 bg-purple-500/5 p-5 animate-fade-in">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircleQuestion size={18} className="text-purple-400" />
        <h3 className="font-bold text-sm text-purple-300">Agents Need Your Input ({tasks.length})</h3>
      </div>
      <div className="space-y-4">
        {tasks.map(t => {
          const a = AGENTS[t.agent as keyof typeof AGENTS];
          return (
            <div key={t.id} className="bg-[var(--bg-card)] rounded-lg p-4 border border-[var(--border)]">
              <div className="flex items-center gap-2 mb-2">
                <AgentBadge agentId={t.agent as keyof typeof AGENTS} />
                <span className="text-sm font-medium">{t.title}</span>
                {t.client_name && <span className="text-xs text-[var(--text-muted)]">· {t.client_name}</span>}
              </div>
              <div className="text-sm text-purple-300 bg-purple-500/10 rounded-lg p-3 mb-3 whitespace-pre-wrap">
                {t.agent_questions}
              </div>
              <div className="flex gap-2">
                <textarea
                  className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-purple-500 resize-none h-16"
                  placeholder="Answer the agent's questions..."
                  value={answers[t.id] || ''}
                  onChange={e => setAnswers({ ...answers, [t.id]: e.target.value })}
                />
                <button
                  onClick={() => { onAnswer(t.id, answers[t.id] || ''); setAnswers({ ...answers, [t.id]: '' }); }}
                  disabled={!answers[t.id]?.trim()}
                  className="px-4 rounded-lg bg-purple-500 text-white font-medium text-sm hover:bg-purple-600 disabled:opacity-40 transition-all flex items-center gap-2 shrink-0">
                  <Send size={14} /> Answer
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Create Task Modal ──
function CreateTaskModal({ open, onClose, onCreated, clients, projects }: {
  open: boolean; onClose: () => void; onCreated: () => void;
  clients: ClientOption[]; projects: ProjectOption[];
}) {
  const [form, setForm] = useState({
    title: '', description: '', priority: 'medium', agent: 'unassigned', category: 'general',
    due_date: '', client_id: '', project_id: '', requirements: ''
  });
  const [saving, setSaving] = useState(false);

  const filteredProjects = form.client_id ? projects.filter(p => p.client_id === Number(form.client_id)) : projects;

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSaving(true);
    await fetch('/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        client_id: form.client_id ? Number(form.client_id) : null,
        project_id: form.project_id ? Number(form.project_id) : null,
        due_date: form.due_date || null,
      }),
    });
    setSaving(false);
    setForm({ title: '', description: '', priority: 'medium', agent: 'unassigned', category: 'general', due_date: '', client_id: '', project_id: '', requirements: '' });
    onCreated();
    onClose();
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
            <input className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors"
              value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="What needs to be done?" autoFocus />
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Description</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none h-20"
              value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Details, context, links..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Client</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.client_id} onChange={e => setForm({ ...form, client_id: e.target.value, project_id: '' })}>
                <option value="">No Client</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Project</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.project_id} onChange={e => setForm({ ...form, project_id: e.target.value })}>
                <option value="">No Project</option>
                {filteredProjects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Assign To</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.agent} onChange={e => setForm({ ...form, agent: e.target.value })}>
                {Object.values(AGENTS).map(a => (
                  <option key={a.id} value={a.id}>{a.emoji} {a.name} {a.role ? `— ${a.role}` : ''}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Priority</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Category</label>
              <select className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Due Date</label>
              <input type="date" className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)]"
                value={form.due_date} onChange={e => setForm({ ...form, due_date: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">Requirements / Context for Agent</label>
            <textarea className="w-full bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[var(--accent)] transition-colors resize-none h-20"
              value={form.requirements} onChange={e => setForm({ ...form, requirements: e.target.value })} placeholder="Specific requirements, URLs, credentials, acceptance criteria..." />
          </div>
          <button type="submit" disabled={saving || !form.title.trim()}
            className="w-full py-2.5 rounded-lg font-medium text-sm bg-[var(--accent)] text-black hover:opacity-90 disabled:opacity-40 transition-opacity">
            {saving ? 'Creating...' : 'Create Task'}
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Task Row ──
function TaskRow({ task, onUpdate, onDelete, onDispatch, clients, projects }: {
  task: Task;
  onUpdate: (id: number, data: Partial<Task>) => void;
  onDelete: (id: number) => void;
  onDispatch: (id: number) => void;
  clients: ClientOption[];
  projects: ProjectOption[];
}) {
  const [expanded, setExpanded] = useState(false);
  const [editReqs, setEditReqs] = useState(false);
  const [reqs, setReqs] = useState(task.requirements || '');

  const isDispatching = task.status === 'in_progress' && task.dispatch_count > 0;

  return (
    <div className={`group border rounded-xl bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all animate-fade-in ${
      task.status === 'needs_info' ? 'border-purple-500/40' : 'border-[var(--border)]'
    }`}>
      <div className="flex items-center gap-3 px-4 py-3.5">
        {/* Dispatch / Status button */}
        <div className="shrink-0 flex items-center gap-1">
          {task.status === 'queued' && task.agent !== 'unassigned' ? (
            <button onClick={() => onDispatch(task.id)}
              className="w-7 h-7 rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 hover:scale-110 transition-all"
              title="Start — dispatch to agent">
              <Play size={12} fill="currentColor" />
            </button>
          ) : task.status === 'needs_info' ? (
            <span className="w-7 h-7 rounded-full border-2 border-purple-500 flex items-center justify-center text-purple-500" title="Needs your input">
              <MessageCircleQuestion size={14} />
            </span>
          ) : task.status === 'in_progress' ? (
            <span className="w-7 h-7 rounded-full border-2 border-amber-500 flex items-center justify-center" title="Agent is working">
              <span className="w-2 h-2 rounded-full bg-amber-500 pulse-dot" />
            </span>
          ) : task.status === 'done' ? (
            <button onClick={() => onUpdate(task.id, { status: 'queued' })}
              className="w-7 h-7 rounded-full border-2 border-emerald-500 bg-emerald-500/30 flex items-center justify-center text-emerald-500 hover:scale-110 transition-all"
              title="Reopen">
              <CheckCircle2 size={14} />
            </button>
          ) : task.status === 'blocked' ? (
            <button onClick={() => onUpdate(task.id, { status: 'queued' })}
              className="w-7 h-7 rounded-full border-2 border-red-500 flex items-center justify-center text-red-500 hover:scale-110 transition-all"
              title="Unblock">
              <AlertTriangle size={12} />
            </button>
          ) : (
            <button onClick={() => onUpdate(task.id, { status: 'queued' })}
              className="w-6 h-6 rounded-full border-2 border-[var(--text-muted)] hover:scale-110 transition-all" />
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          <div className={`font-medium text-sm ${task.status === 'done' ? 'line-through text-[var(--text-muted)]' : ''}`}>
            {task.title}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            {task.client_name && <span className="text-[10px] text-[var(--text-muted)]">{task.client_name}</span>}
            {task.project_name && <span className="text-[10px] text-[var(--text-muted)]">· {task.project_name}</span>}
            {task.dispatch_count > 0 && (
              <span className="text-[10px] text-amber-400">· dispatched {task.dispatch_count}x</span>
            )}
          </div>
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 shrink-0">
          {task.status === 'needs_info' && <StatusBadge status="needs_info" />}
          <PriorityDot priority={task.priority} />
          <span className="text-[10px] text-[var(--text-muted)] bg-[var(--bg-secondary)] px-2 py-0.5 rounded-full">{task.category}</span>
          <AgentBadge agentId={task.agent} />
          <button onClick={() => setExpanded(!expanded)} className="p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)]">
            <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>

      {/* Expanded panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t border-[var(--border-subtle)] animate-fade-in space-y-3">
          {task.description && <p className="text-sm text-[var(--text-secondary)]">{task.description}</p>}

          {/* Requirements section */}
          <div className="bg-[var(--bg-secondary)] rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={12} /> Requirements
              </span>
              <button onClick={() => setEditReqs(!editReqs)} className="text-xs text-[var(--accent)] hover:underline">
                {editReqs ? 'Cancel' : 'Edit'}
              </button>
            </div>
            {editReqs ? (
              <div className="space-y-2">
                <textarea className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[var(--accent)] resize-none h-24"
                  value={reqs} onChange={e => setReqs(e.target.value)} placeholder="Add requirements, URLs, credentials, acceptance criteria..." />
                <button onClick={() => { onUpdate(task.id, { requirements: reqs }); setEditReqs(false); }}
                  className="text-xs px-3 py-1.5 rounded-lg bg-[var(--accent)] text-black font-medium hover:opacity-90">
                  Save Requirements
                </button>
              </div>
            ) : (
              <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">
                {task.requirements || <span className="italic text-[var(--text-muted)]">No requirements set — add context before dispatching</span>}
              </p>
            )}
          </div>

          {/* Agent questions */}
          {task.agent_questions && (
            <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-3">
              <span className="text-xs font-medium text-purple-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
                <MessageCircleQuestion size={12} /> Agent Questions
              </span>
              <p className="text-sm text-purple-300 whitespace-pre-wrap">{task.agent_questions}</p>
            </div>
          )}

          {/* Agent output */}
          {task.agent_output && (
            <details className="bg-[var(--bg-secondary)] rounded-lg">
              <summary className="px-3 py-2 text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider cursor-pointer hover:text-[var(--text-secondary)]">
                Agent Output ({task.agent_output.length} chars)
              </summary>
              <div className="px-3 pb-3">
                <pre className="text-xs text-[var(--text-secondary)] whitespace-pre-wrap max-h-60 overflow-y-auto">
                  {task.agent_output}
                </pre>
              </div>
            </details>
          )}

          {/* Controls */}
          <div className="flex flex-wrap gap-2">
            <select className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1"
              value={task.status} onChange={e => {
                const newStatus = e.target.value;
                if (newStatus === 'in_progress' && task.agent !== 'unassigned') {
                  onDispatch(task.id);
                } else {
                  onUpdate(task.id, { status: newStatus as Task['status'] });
                }
              }}>
              {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
            </select>
            <select className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1"
              value={task.agent} onChange={e => onUpdate(task.id, { agent: e.target.value as Task['agent'] })}>
              {Object.values(AGENTS).map(a => <option key={a.id} value={a.id}>{a.emoji} {a.name}</option>)}
            </select>
            <select className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1"
              value={task.priority} onChange={e => onUpdate(task.id, { priority: e.target.value as Task['priority'] })}>
              {Object.entries(PRIORITIES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
            <select className="text-xs bg-[var(--bg-secondary)] border border-[var(--border)] rounded-lg px-2 py-1"
              value={task.client_id || ''} onChange={e => onUpdate(task.id, { client_id: e.target.value ? Number(e.target.value) : null } as Partial<Task>)}>
              <option value="">No Client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {task.status === 'queued' && task.agent !== 'unassigned' && (
              <button onClick={() => onDispatch(task.id)}
                className="text-xs px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-colors flex items-center gap-1.5">
                <Play size={12} fill="currentColor" /> Start Task
              </button>
            )}
            {task.status === 'needs_info' && (
              <button onClick={() => onDispatch(task.id)}
                className="text-xs px-3 py-1 rounded-lg bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30 transition-colors flex items-center gap-1.5">
                <Send size={12} /> Re-dispatch with Info
              </button>
            )}
            <button onClick={() => onDelete(task.id)}
              className="text-xs px-2 py-1 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 transition-colors ml-auto">
              Delete
            </button>
          </div>

          <div className="text-[10px] text-[var(--text-muted)]">
            Created {new Date(task.created_at).toLocaleString()} · Updated {new Date(task.updated_at).toLocaleString()}
            {task.completed_at && ` · Completed ${new Date(task.completed_at).toLocaleString()}`}
            {task.last_dispatched_at && ` · Last dispatched ${new Date(task.last_dispatched_at).toLocaleString()}`}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Agent Column (Board View) ──
function AgentColumn({ agentId, tasks, onUpdate, onDelete, onDispatch, clients, projects }: {
  agentId: keyof typeof AGENTS; tasks: Task[];
  onUpdate: (id: number, data: Partial<Task>) => void; onDelete: (id: number) => void;
  onDispatch: (id: number) => void; clients: ClientOption[]; projects: ProjectOption[];
}) {
  const a = AGENTS[agentId];
  const active = tasks.filter(t => t.status !== 'done');
  const done = tasks.filter(t => t.status === 'done');

  return (
    <div className="flex-1 min-w-[300px] max-w-[400px]">
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className="text-xl">{a.emoji}</span>
        <span className="font-bold text-sm">{a.name}</span>
        <span className="text-xs text-[var(--text-muted)]">{a.role}</span>
        <span className="ml-auto text-xs font-mono px-2 py-0.5 rounded-full" style={{ background: a.color + '18', color: a.color }}>{tasks.length}</span>
      </div>
      <div className="space-y-2">
        {active.map(t => <TaskRow key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} onDispatch={onDispatch} clients={clients} projects={projects} />)}
        {done.length > 0 && (
          <details className="group">
            <summary className="text-xs text-[var(--text-muted)] cursor-pointer py-1 px-2 hover:text-[var(--text-secondary)]">
              {done.length} completed
            </summary>
            <div className="space-y-2 mt-2 opacity-60">
              {done.map(t => <TaskRow key={t.id} task={t} onUpdate={onUpdate} onDelete={onDelete} onDispatch={onDispatch} clients={clients} projects={projects} />)}
            </div>
          </details>
        )}
      </div>
    </div>
  );
}

// ── Main Dashboard ──
export default function Dashboard() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [gateway, setGateway] = useState<{ status: string; output: string }>({ status: 'checking', output: '' });
  const [view, setView] = useState<'board' | 'list'>('board');
  const [filterAgent, setFilterAgent] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState<ClientOption[]>([]);
  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [dispatching, setDispatching] = useState<Set<number>>(new Set());

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterAgent !== 'all') params.set('agent', filterAgent);
    if (filterStatus !== 'all') params.set('status', filterStatus);

    const [tasksRes, statsRes, gwRes, clientsRes, projectsRes] = await Promise.all([
      fetch(`/api/tasks?${params}`),
      fetch('/api/stats'),
      fetch('/api/gateway'),
      fetch('/api/clients'),
      fetch('/api/projects'),
    ]);
    setTasks(await tasksRes.json());
    setStats(await statsRes.json());
    setGateway(await gwRes.json());
    setClients(await clientsRes.json());
    setProjects(await projectsRes.json());
    setLoading(false);
  }, [filterAgent, filterStatus]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Auto-refresh every 15s to catch agent completions
  useEffect(() => {
    const interval = setInterval(fetchAll, 15000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  async function updateTask(id: number, data: Partial<Task>) {
    await fetch(`/api/tasks/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    fetchAll();
  }

  async function deleteTask(id: number) {
    if (!confirm('Delete this task?')) return;
    await fetch(`/api/tasks/${id}`, { method: 'DELETE' });
    fetchAll();
  }

  async function dispatchTask(id: number) {
    setDispatching(prev => new Set(prev).add(id));
    try {
      const res = await fetch(`/api/tasks/${id}/dispatch`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Dispatch failed');
      }
    } catch (err) {
      alert('Dispatch failed: ' + err);
    }
    setDispatching(prev => { const n = new Set(prev); n.delete(id); return n; });
    fetchAll();
  }

  async function answerQuestions(taskId: number, answer: string) {
    // Append the answer to requirements, clear questions, set back to queued
    const task = tasks.find(t => t.id === taskId);
    const newReqs = task?.requirements
      ? `${task.requirements}\n\n--- ADDITIONAL INFO (${new Date().toLocaleString()}) ---\n${answer}`
      : answer;

    await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirements: newReqs, agent_questions: '', status: 'queued' }),
    });
    fetchAll();
  }

  const agentKeys = ['claw', 'bernard', 'vale', 'gumbo'] as const;

  return (
    <div className="min-h-screen">
      <Nav onRefresh={fetchAll} loading={loading} gateway={gateway} />

      <main className="max-w-[1600px] mx-auto px-6 py-6 space-y-6">
        {/* Needs Info Banner */}
        {stats && stats.needsInfoTasks && (
          <NeedsInfoBanner tasks={stats.needsInfoTasks} onAnswer={answerQuestions} />
        )}

        {/* Stats Row */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Tasks" value={stats.total} icon={<LayoutGrid size={20} />} color="#06b6d4" />
            <StatCard label="In Progress" value={stats.byStatus.in_progress || 0} icon={<Zap size={20} />} color="#f59e0b" />
            <StatCard label="Queued" value={stats.byStatus.queued || 0} icon={<Clock size={20} />} color="#6b7280" />
            <StatCard label="Needs Info" value={stats.byStatus.needs_info || 0} icon={<MessageCircleQuestion size={20} />} color="#a855f7" />
            <StatCard label="Completed" value={stats.byStatus.done || 0} icon={<CheckCircle2 size={20} />} color="#10b981" />
          </div>
        )}

        {/* Agent Overview Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {stats.byAgent.filter(a => a.agent !== 'unassigned').map(a => {
              const agent = AGENTS[a.agent as keyof typeof AGENTS];
              if (!agent) return null;
              return (
                <div key={a.agent} className="rounded-xl border border-[var(--border)] bg-[var(--bg-card)] p-4 hover:bg-[var(--bg-card-hover)] transition-colors cursor-pointer"
                  onClick={() => setFilterAgent(filterAgent === a.agent ? 'all' : a.agent)}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xl">{agent.emoji}</span>
                    <div>
                      <div className="font-bold text-sm">{agent.name}</div>
                      <div className="text-[10px] text-[var(--text-muted)]">{agent.role} · {agent.model}</div>
                    </div>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-[var(--text-muted)]">{a.queued} queued</span>
                    <span style={{ color: '#f59e0b' }}>{a.in_progress} active</span>
                    <span style={{ color: '#10b981' }}>{a.done} done</span>
                    {a.needs_info > 0 && <span style={{ color: '#a855f7' }}>{a.needs_info} needs info</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Toolbar */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1 p-1 rounded-lg border border-[var(--border)] bg-[var(--bg-card)]">
            <button onClick={() => setView('board')}
              className={`p-1.5 rounded-md transition-colors ${view === 'board' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <LayoutGrid size={16} />
            </button>
            <button onClick={() => setView('list')}
              className={`p-1.5 rounded-md transition-colors ${view === 'list' ? 'bg-[var(--accent)] text-black' : 'text-[var(--text-muted)] hover:text-[var(--text-primary)]'}`}>
              <List size={16} />
            </button>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-[var(--text-muted)]">
            <Filter size={14} />
            <span>Filter:</span>
          </div>

          <select className="text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text-secondary)]"
            value={filterAgent} onChange={e => setFilterAgent(e.target.value)}>
            <option value="all">All Agents</option>
            {agentKeys.map(k => <option key={k} value={k}>{AGENTS[k].emoji} {AGENTS[k].name}</option>)}
            <option value="unassigned">❓ Unassigned</option>
          </select>

          <select className="text-xs bg-[var(--bg-card)] border border-[var(--border)] rounded-lg px-3 py-1.5 text-[var(--text-secondary)]"
            value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            {Object.entries(STATUSES).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
          </select>

          {(filterAgent !== 'all' || filterStatus !== 'all') && (
            <button onClick={() => { setFilterAgent('all'); setFilterStatus('all'); }}
              className="text-xs text-[var(--accent)] hover:underline">
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-[var(--text-muted)]">{tasks.length} tasks</span>

          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--accent)] text-black font-medium text-sm hover:opacity-90 transition-opacity">
            <Plus size={16} /> New Task
          </button>
        </div>

        {/* Board View */}
        {view === 'board' && (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {agentKeys.map(k => (
              <AgentColumn key={k} agentId={k}
                tasks={tasks.filter(t => t.agent === k)}
                onUpdate={updateTask} onDelete={deleteTask} onDispatch={dispatchTask}
                clients={clients} projects={projects} />
            ))}
            {tasks.some(t => t.agent === 'unassigned') && (
              <AgentColumn agentId="unassigned"
                tasks={tasks.filter(t => t.agent === 'unassigned')}
                onUpdate={updateTask} onDelete={deleteTask} onDispatch={dispatchTask}
                clients={clients} projects={projects} />
            )}
          </div>
        )}

        {/* List View */}
        {view === 'list' && (
          <div className="space-y-2">
            {tasks.map(t => <TaskRow key={t.id} task={t} onUpdate={updateTask} onDelete={deleteTask} onDispatch={dispatchTask} clients={clients} projects={projects} />)}
            {tasks.length === 0 && (
              <div className="text-center py-16 text-[var(--text-muted)]">
                <p className="text-lg mb-2">No tasks yet</p>
                <p className="text-sm">Create your first task to get started</p>
              </div>
            )}
          </div>
        )}

        {/* Activity Feed */}
        {stats && stats.recentActivity.length > 0 && (
          <div className="border border-[var(--border)] rounded-xl bg-[var(--bg-card)] p-5">
            <div className="flex items-center gap-2 mb-4">
              <Activity size={16} className="text-[var(--accent)]" />
              <h3 className="font-bold text-sm">Recent Activity</h3>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {stats.recentActivity.map(a => (
                <div key={a.id} className="flex items-start gap-3 text-xs animate-slide-in">
                  <span className="text-[var(--text-muted)] shrink-0 w-32">{new Date(a.created_at).toLocaleString()}</span>
                  {a.agent && <AgentBadge agentId={a.agent as keyof typeof AGENTS} />}
                  <span className="text-[var(--text-secondary)]">
                    <span className={`font-medium capitalize ${a.action === 'dispatched' ? 'text-emerald-400' : a.action === 'needs_info' ? 'text-purple-400' : a.action === 'completed' ? 'text-emerald-400' : a.action === 'error' ? 'text-red-400' : ''}`}>
                      {a.action}
                    </span>
                    {a.task_title && <> · <span className="text-[var(--text-muted)]">{a.task_title}</span></>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <CreateTaskModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={fetchAll} clients={clients} projects={projects} />
    </div>
  );
}
