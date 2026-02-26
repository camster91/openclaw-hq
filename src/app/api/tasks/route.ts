import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const { searchParams } = req.nextUrl;
    const agent = searchParams.get('agent');
    const status = searchParams.get('status');
    const clientId = searchParams.get('client_id');
    const projectId = searchParams.get('project_id');

    let query = `SELECT t.*, c.name as client_name, p.name as project_name 
      FROM tasks t 
      LEFT JOIN clients c ON t.client_id = c.id 
      LEFT JOIN projects p ON t.project_id = p.id 
      WHERE 1=1`;
    const params: string[] = [];

    if (agent && agent !== 'all') { query += ' AND t.agent = ?'; params.push(agent); }
    if (status && status !== 'all') { query += ' AND t.status = ?'; params.push(status); }
    if (clientId) { query += ' AND t.client_id = ?'; params.push(clientId); }
    if (projectId) { query += ' AND t.project_id = ?'; params.push(projectId); }

    query += ` ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END, t.created_at DESC`;

    const tasks = db.prepare(query).all(...params);
    return NextResponse.json(tasks);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { title, description, priority, agent, category, due_date, client_id, project_id, requirements } = body;
    if (!title) return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    const result = db.prepare(`
      INSERT INTO tasks (title, description, priority, agent, category, due_date, client_id, project_id, requirements)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(title, description || '', priority || 'medium', agent || 'unassigned', category || 'general', due_date || null, client_id || null, project_id || null, requirements || '');
    db.prepare(`INSERT INTO activity_log (task_id, agent, action, detail) VALUES (?, ?, 'created', ?)`).run(result.lastInsertRowid, agent || 'unassigned', `Task "${title}" created`);
    const task = db.prepare('SELECT t.*, c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?').get(result.lastInsertRowid);
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
