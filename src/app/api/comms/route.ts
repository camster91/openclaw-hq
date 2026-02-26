import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const db = getDb();
    const clientId = req.nextUrl.searchParams.get('client_id');
    const actionNeeded = req.nextUrl.searchParams.get('action_needed');
    let query = `SELECT co.*, c.name as client_name FROM communications co LEFT JOIN clients c ON co.client_id = c.id WHERE 1=1`;
    const params: string[] = [];
    if (clientId) { query += ' AND co.client_id = ?'; params.push(clientId); }
    if (actionNeeded === '1') { query += ' AND co.action_needed = 1 AND co.action_taken = 0'; }
    query += ' ORDER BY co.created_at DESC LIMIT 100';
    const comms = db.prepare(query).all(...params);
    return NextResponse.json(comms);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const db = getDb();
    const body = await req.json();
    const { client_id, project_id, channel, direction, subject, summary, raw_content, from_name, from_address, action_needed } = body;
    const result = db.prepare(`
      INSERT INTO communications (client_id, project_id, channel, direction, subject, summary, raw_content, from_name, from_address, action_needed)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(client_id || null, project_id || null, channel || 'email', direction || 'inbound', subject || '', summary || '', raw_content || '', from_name || '', from_address || '', action_needed ? 1 : 0);
    const comm = db.prepare('SELECT * FROM communications WHERE id = ?').get(result.lastInsertRowid);
    return NextResponse.json(comm, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
