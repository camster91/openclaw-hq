import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const status = req.nextUrl.searchParams.get('status');
    let query = `SELECT c.*, 
      (SELECT COUNT(*) FROM projects p WHERE p.client_id = c.id) as project_count,
      (SELECT COUNT(*) FROM tasks t WHERE t.client_id = c.id AND t.status != 'done') as open_tasks,
      (SELECT COUNT(*) FROM communications co WHERE co.client_id = c.id AND co.action_needed = 1 AND co.action_taken = 0) as pending_comms
    FROM clients c WHERE 1=1`;
    const params: string[] = [];
    if (status && status !== 'all') { query += ' AND c.status = ?'; params.push(status); }
    query += ` ORDER BY CASE c.status WHEN 'active' THEN 0 WHEN 'lead' THEN 1 WHEN 'paused' THEN 2 ELSE 3 END, c.updated_at DESC`;
    const clients = db.prepare(query).all(...params);
    return NextResponse.json(clients);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { name, contact_name, contact_email, source, status, platform, wp_login_url, wp_username, shopify_store, monthly_retainer, notes } = body;
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    const result = db.prepare(`
      INSERT INTO clients (name, contact_name, contact_email, source, status, platform, wp_login_url, wp_username, shopify_store, monthly_retainer, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(name, contact_name || '', contact_email || '', source || 'direct', status || 'active', platform || '', wp_login_url || '', wp_username || '', shopify_store || '', monthly_retainer || 0, notes || '');
    const client = db.prepare('SELECT * FROM clients WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(client, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
