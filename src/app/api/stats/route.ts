import { NextResponse } from 'next/server';
import getDb from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    const byStatus = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all() as { status: string; count: number }[];
    const byAgent = db.prepare(`
      SELECT agent, COUNT(*) as total,
        SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done,
        SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress,
        SUM(CASE WHEN status = 'queued' THEN 1 ELSE 0 END) as queued,
        SUM(CASE WHEN status = 'blocked' THEN 1 ELSE 0 END) as blocked,
        SUM(CASE WHEN status = 'needs_info' THEN 1 ELSE 0 END) as needs_info
      FROM tasks GROUP BY agent
    `).all();
    const byPriority = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all() as { priority: string; count: number }[];
    const totalTasks = db.prepare('SELECT COUNT(*) as c FROM tasks').get() as { c: number };

    const activeClients = db.prepare("SELECT COUNT(*) as c FROM clients WHERE status = 'active'").get() as { c: number };
    const totalClients = db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number };
    const pendingComms = db.prepare('SELECT COUNT(*) as c FROM communications WHERE action_needed = 1 AND action_taken = 0').get() as { c: number };
    const recentComms = db.prepare(`
      SELECT co.*, c.name as client_name FROM communications co
      LEFT JOIN clients c ON co.client_id = c.id
      ORDER BY co.created_at DESC LIMIT 10
    `).all();

    const recentActivity = db.prepare(`
      SELECT al.*, t.title as task_title FROM activity_log al
      LEFT JOIN tasks t ON al.task_id = t.id
      ORDER BY al.created_at DESC LIMIT 20
    `).all();

    const needsInfoTasks = db.prepare(`
      SELECT t.id, t.title, t.agent, t.agent_questions, c.name as client_name
      FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.status = 'needs_info' ORDER BY t.updated_at DESC
    `).all();

    return NextResponse.json({
      total: totalTasks.c,
      byStatus: Object.fromEntries(byStatus.map(r => [r.status, r.count])),
      byAgent,
      byPriority: Object.fromEntries(byPriority.map(r => [r.priority, r.count])),
      activeClients: activeClients.c,
      totalClients: totalClients.c,
      pendingComms: pendingComms.c,
      recentComms,
      recentActivity,
      needsInfoTasks,
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
