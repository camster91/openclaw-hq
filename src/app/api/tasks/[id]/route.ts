import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const task = db.prepare(`
    SELECT t.*, c.name as client_name, p.name as project_name 
    FROM tasks t 
    LEFT JOIN clients c ON t.client_id = c.id 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE t.id = ?
  `).get(id);
  if (!task) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(task);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const body = await req.json();

  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const fields: string[] = [];
  const values: unknown[] = [];
  const allowed = ['title', 'description', 'status', 'priority', 'agent', 'category', 'due_date', 'notes',
    'requirements', 'agent_questions', 'agent_output', 'client_id', 'project_id'];

  for (const key of allowed) {
    if (body[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(body[key]);
    }
  }

  if (body.status === 'done' && existing.status !== 'done') {
    fields.push('completed_at = datetime("now")');
  }
  if (body.status && body.status !== 'done') {
    fields.push('completed_at = NULL');
  }

  // Clear agent questions when answering (providing requirements clears the needs_info)
  if (body.requirements !== undefined && existing.status === 'needs_info') {
    if (!body.status) {
      // Auto-transition back to queued so user can re-dispatch
      fields.push('status = ?');
      values.push('queued');
      fields.push('agent_questions = ?');
      values.push('');
    }
  }

  fields.push('updated_at = datetime("now")');
  values.push(id);

  db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);

  // Log changes
  const changes: string[] = [];
  for (const key of allowed) {
    if (body[key] !== undefined && body[key] !== existing[key]) {
      changes.push(`${key}: ${existing[key]} → ${body[key]}`);
    }
  }
  if (changes.length > 0) {
    db.prepare(`
      INSERT INTO activity_log (task_id, agent, action, detail)
      VALUES (?, ?, 'updated', ?)
    `).run(id, body.agent || existing.agent, changes.join('; '));
  }

  const task = db.prepare(`
    SELECT t.*, c.name as client_name, p.name as project_name 
    FROM tasks t 
    LEFT JOIN clients c ON t.client_id = c.id 
    LEFT JOIN projects p ON t.project_id = p.id 
    WHERE t.id = ?
  `).get(id);
  return NextResponse.json(task);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  db.prepare(`
    INSERT INTO activity_log (task_id, agent, action, detail)
    VALUES (?, ?, 'deleted', ?)
  `).run(id, existing.agent, `Task "${existing.title}" deleted`);

  db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return NextResponse.json({ success: true });
}
