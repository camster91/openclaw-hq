import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const clientId = req.nextUrl.searchParams.get('client_id');
    let query = `SELECT p.*, c.name as client_name,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id) as task_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.project_id = p.id AND t.status != 'done') as open_tasks
    FROM projects p
    LEFT JOIN clients c ON p.client_id = c.id
    WHERE 1=1`;
    const params: string[] = [];
    if (clientId) { query += ' AND p.client_id = ?'; params.push(clientId); }
    query += ' ORDER BY p.status, p.created_at DESC';
    const projects = db.prepare(query).all(...params);
    return NextResponse.json(projects);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { client_id, name, description, status, project_type, budget, hours_estimated, due_date } = body;
    if (!client_id || !name) return NextResponse.json({ error: 'client_id and name are required' }, { status: 400 });
    const result = db.prepare(`
      INSERT INTO projects (client_id, name, description, status, project_type, budget, hours_estimated, due_date)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id, name, description || '', status || 'active', project_type || 'other', budget || 0, hours_estimated || 0, due_date || null);
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(project, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
