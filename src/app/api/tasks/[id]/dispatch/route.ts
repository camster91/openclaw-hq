import { NextRequest, NextResponse } from 'next/server';
import getDb from '@/lib/db';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

type TaskRow = {
  id: number; title: string; description: string; status: string;
  priority: string; agent: string; category: string;
  client_id: number | null; project_id: number | null;
  requirements: string; agent_questions: string; agent_output: string;
  notes: string; dispatch_count: number;
};
type ClientRow = { name: string; platform: string; shopify_store: string; wp_login_url: string; notes: string };
type ProjectRow = { name: string; description: string; project_type: string };

function buildBriefing(task: TaskRow, client: ClientRow | null, project: ProjectRow | null): string {
  const lines: string[] = [];

  lines.push(`=== TASK BRIEFING ===`);
  lines.push(`TASK #${task.id}: ${task.title}`);
  lines.push(`PRIORITY: ${task.priority}`);
  lines.push(`CATEGORY: ${task.category}`);

  if (client) {
    lines.push(``);
    lines.push(`CLIENT: ${client.name}`);
    if (client.platform) lines.push(`PLATFORM: ${client.platform}`);
    if (client.shopify_store) lines.push(`SHOPIFY: ${client.shopify_store}`);
    if (client.wp_login_url) lines.push(`WP LOGIN: ${client.wp_login_url}`);
    if (client.notes) lines.push(`CLIENT NOTES: ${client.notes}`);
  }

  if (project) {
    lines.push(``);
    lines.push(`PROJECT: ${project.name}`);
    if (project.project_type) lines.push(`TYPE: ${project.project_type}`);
    if (project.description) lines.push(`PROJECT DESCRIPTION: ${project.description}`);
  }

  lines.push(``);
  lines.push(`DESCRIPTION: ${task.description || '(none provided)'}`);

  if (task.requirements) {
    lines.push(``);
    lines.push(`REQUIREMENTS:`);
    lines.push(task.requirements);
  }

  if (task.agent_output && task.dispatch_count > 0) {
    lines.push(``);
    lines.push(`PREVIOUS AGENT OUTPUT:`);
    lines.push(task.agent_output);
  }

  if (task.notes) {
    lines.push(``);
    lines.push(`NOTES: ${task.notes}`);
  }

  lines.push(``);
  lines.push(`=== INSTRUCTIONS ===`);
  lines.push(`Execute this task. Work through it step by step.`);
  lines.push(`If you need more information or clarification from the project owner before you can proceed, respond with your output so far, then on a new line write NEEDS_INFO: followed by your specific questions (one per line).`);
  lines.push(`If you complete the task, end with TASK_COMPLETE: followed by a brief summary of what was done.`);

  return lines.join('\n');
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  try {
    const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as TaskRow | undefined;
    if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    if (task.agent === 'unassigned') return NextResponse.json({ error: 'Task must be assigned to an agent before dispatch' }, { status: 400 });

    // Get client/project context
    const client = task.client_id
      ? db.prepare('SELECT name, platform, shopify_store, wp_login_url, notes FROM clients WHERE id = ?').get(task.client_id) as ClientRow | null
      : null;
    const project = task.project_id
      ? db.prepare('SELECT name, description, project_type FROM projects WHERE id = ?').get(task.project_id) as ProjectRow | null
      : null;

    const briefing = buildBriefing(task, client, project);

    // Update task status
    db.prepare(`
      UPDATE tasks SET status = 'in_progress', dispatch_count = dispatch_count + 1, 
      last_dispatched_at = datetime('now'), updated_at = datetime('now') WHERE id = ?
    `).run(id);

    // Log dispatch
    db.prepare(`
      INSERT INTO activity_log (task_id, client_id, project_id, agent, action, detail)
      VALUES (?, ?, ?, ?, 'dispatched', ?)
    `).run(id, task.client_id, task.project_id, task.agent, `Task dispatched to ${task.agent}: "${task.title}"`);

    // Dispatch to OpenClaw agent (async — don't await, it can take minutes)
    const escapedBriefing = briefing.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    const cmd = `openclaw agent --agent ${task.agent} --message "${escapedBriefing}" --local --json`;

    // Fire the agent in the background, capture result
    execAsync(cmd, { timeout: 600000 })
      .then(({ stdout }) => {
        let agentReply = stdout.trim();

        // Try to parse JSON output
        try {
          const parsed = JSON.parse(agentReply);
          if (parsed.reply) agentReply = parsed.reply;
          else if (parsed.content) agentReply = parsed.content;
          else if (parsed.message) agentReply = parsed.message;
        } catch {
          // Raw text output, use as-is
        }

        // Check if agent needs info
        const needsInfoMatch = agentReply.match(/NEEDS_INFO:([\s\S]*?)(?:TASK_COMPLETE:|$)/i);
        const taskCompleteMatch = agentReply.match(/TASK_COMPLETE:([\s\S]*?)$/i);

        if (needsInfoMatch) {
          const questions = needsInfoMatch[1].trim();
          db.prepare(`
            UPDATE tasks SET status = 'needs_info', agent_questions = ?, agent_output = ?,
            updated_at = datetime('now') WHERE id = ?
          `).run(questions, agentReply, id);

          db.prepare(`
            INSERT INTO activity_log (task_id, agent, action, detail)
            VALUES (?, ?, 'needs_info', ?)
          `).run(id, task.agent, `Agent needs info: ${questions.slice(0, 200)}`);

        } else if (taskCompleteMatch) {
          const summary = taskCompleteMatch[1].trim();
          db.prepare(`
            UPDATE tasks SET status = 'done', agent_output = ?, completed_at = datetime('now'),
            updated_at = datetime('now') WHERE id = ?
          `).run(agentReply, id);

          db.prepare(`
            INSERT INTO activity_log (task_id, agent, action, detail)
            VALUES (?, ?, 'completed', ?)
          `).run(id, task.agent, `Task completed: ${summary.slice(0, 200)}`);

        } else {
          // Agent responded but didn't use markers — store output, keep in_progress
          db.prepare(`
            UPDATE tasks SET agent_output = ?, updated_at = datetime('now') WHERE id = ?
          `).run(agentReply, id);

          db.prepare(`
            INSERT INTO activity_log (task_id, agent, action, detail)
            VALUES (?, ?, 'output', ?)
          `).run(id, task.agent, `Agent output received (${agentReply.length} chars)`);
        }
      })
      .catch((err: Error) => {
        // Agent failed — log it, set back to queued
        const errorMsg = err.message || String(err);
        db.prepare(`
          UPDATE tasks SET status = 'blocked', agent_output = ?, updated_at = datetime('now') WHERE id = ?
        `).run(`DISPATCH ERROR: ${errorMsg}`, id);

        db.prepare(`
          INSERT INTO activity_log (task_id, agent, action, detail)
          VALUES (?, ?, 'error', ?)
        `).run(id, task.agent, `Dispatch failed: ${errorMsg.slice(0, 300)}`);
      });

    // Return immediately — agent runs in background
    const updated = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    return NextResponse.json({ dispatched: true, task: updated, briefing });

  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
