import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    if (!client) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const projects = db.prepare('SELECT * FROM projects WHERE client_id = ? ORDER BY status, created_at DESC').all(id);
    const tasks = db.prepare(`SELECT t.*, c.name as client_name FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.client_id = ? ORDER BY CASE t.priority WHEN 'urgent' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END`).all(id);
    const comms = db.prepare(`SELECT * FROM communications WHERE client_id = ? ORDER BY created_at DESC LIMIT 50`).all(id);
    return NextResponse.json({ client, projects, tasks, comms });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const db = getDb();
    const body = await req.json();
    const allowed = ['name', 'contact_name', 'contact_email', 'source', 'status', 'platform', 'wp_login_url', 'wp_username', 'shopify_store', 'hosting_info', 'monthly_retainer', 'notes'];
    const fields: string[] = [];
    const values: unknown[] = [];
    for (const key of allowed) {
      if (body[key] !== undefined) { fields.push(`${key} = ?`); values.push(body[key]); }
    }
    fields.push('updated_at = datetime("now")');
    values.push(id);
    db.prepare(`UPDATE clients SET ${fields.join(', ')} WHERE id = ?`).run(...values);
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(id);
    return NextResponse.json(client);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
