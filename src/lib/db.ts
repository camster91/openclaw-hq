import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'openclaw-hq.db');

let db: Database.Database;

function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    migrate(db);
  }
  return db;
}

function migrate(db: Database.Database) {
  // v1 — base tables
  db.exec(`
    -- Clients table
    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      contact_name TEXT DEFAULT '',
      contact_email TEXT DEFAULT '',
      source TEXT DEFAULT 'direct' CHECK(source IN ('upwork','direct','referral','ashbi','other')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('lead','active','paused','completed','archived')),
      platform TEXT DEFAULT '' ,
      wp_login_url TEXT DEFAULT '',
      wp_username TEXT DEFAULT '',
      shopify_store TEXT DEFAULT '',
      hosting_info TEXT DEFAULT '',
      monthly_retainer REAL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Projects table (one client can have many projects)
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('planning','active','review','paused','completed','archived')),
      project_type TEXT DEFAULT 'web-design' CHECK(project_type IN ('web-design','branding','shopify','wordpress','maintenance','seo','custom-dev','packaging','other')),
      budget REAL DEFAULT 0,
      hours_estimated REAL DEFAULT 0,
      hours_used REAL DEFAULT 0,
      upwork_contract_id TEXT DEFAULT '',
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    );

    -- Tasks (linked to projects/clients)
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'queued' CHECK(status IN ('queued','in_progress','needs_info','done','blocked')),
      priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low','medium','high','urgent')),
      agent TEXT NOT NULL DEFAULT 'gumbo' CHECK(agent IN ('claw','bernard','vale','gumbo','unassigned')),
      category TEXT DEFAULT 'general',
      client_id INTEGER,
      project_id INTEGER,
      due_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT,
      notes TEXT DEFAULT '',
      requirements TEXT DEFAULT '',
      agent_questions TEXT DEFAULT '',
      agent_output TEXT DEFAULT '',
      dispatch_count INTEGER DEFAULT 0,
      last_dispatched_at TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Communications log
    CREATE TABLE IF NOT EXISTS communications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER,
      project_id INTEGER,
      channel TEXT NOT NULL DEFAULT 'email' CHECK(channel IN ('email','upwork','slack','phone','meeting','other')),
      direction TEXT NOT NULL DEFAULT 'inbound' CHECK(direction IN ('inbound','outbound')),
      subject TEXT DEFAULT '',
      summary TEXT DEFAULT '',
      raw_content TEXT DEFAULT '',
      from_name TEXT DEFAULT '',
      from_address TEXT DEFAULT '',
      action_needed INTEGER DEFAULT 0,
      action_taken INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE SET NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL
    );

    -- Activity log
    CREATE TABLE IF NOT EXISTS activity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER,
      client_id INTEGER,
      project_id INTEGER,
      agent TEXT,
      action TEXT NOT NULL,
      detail TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );
  `);

  // v2 — add new columns if missing (safe migration for existing DBs)
  const taskCols = db.prepare("PRAGMA table_info(tasks)").all() as { name: string }[];
  const colNames = taskCols.map(c => c.name);

  if (!colNames.includes('requirements')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN requirements TEXT DEFAULT ''`);
  }
  if (!colNames.includes('agent_questions')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN agent_questions TEXT DEFAULT ''`);
  }
  if (!colNames.includes('agent_output')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN agent_output TEXT DEFAULT ''`);
  }
  if (!colNames.includes('dispatch_count')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN dispatch_count INTEGER DEFAULT 0`);
  }
  if (!colNames.includes('last_dispatched_at')) {
    db.exec(`ALTER TABLE tasks ADD COLUMN last_dispatched_at TEXT`);
  }

  // Seed clients if empty
  const count = db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number };
  if (count.c === 0) {
    seedData(db);
  }
}

function seedData(db: Database.Database) {
  const insertClient = db.prepare(`
    INSERT INTO clients (name, contact_name, contact_email, source, status, platform, wp_login_url, shopify_store, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertProject = db.prepare(`
    INSERT INTO projects (client_id, name, description, status, project_type)
    VALUES (?, ?, ?, ?, ?)
  `);

  const insertTask = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, agent, category, client_id, project_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const clients = [
    { name: 'PrintCup', contact: '', email: '', source: 'upwork', status: 'active', platform: 'shopify', wp: '', shopify: 'printcup.myshopify.com', notes: 'Shopify store — cart customization, product fees, Klaviyo email setup' },
    { name: 'Numan', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'Active Ashbi Design client — multiple projects in Notion' },
    { name: 'Total ETO', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'Active Ashbi Design client' },
    { name: 'Della', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'Active Ashbi Design client — revisions, product pages' },
    { name: 'Brushamania', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'brushamania.ca — active WordPress site' },
    { name: '4EVRstrong', contact: '', email: '', source: 'upwork', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'WordPress site — active login session' },
    { name: 'Frac Tank', contact: '', email: '', source: 'upwork', status: 'active', platform: 'other', wp: '', shopify: '', notes: 'Update project' },
    { name: 'National Enquirer', contact: '', email: '', source: 'upwork', status: 'active', platform: 'other', wp: '', shopify: '', notes: 'Active project — multiple browser tabs' },
    { name: 'Criswell Library', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'From Notion board' },
    { name: 'Wellington Altus', contact: '', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: 'wellington-altus.ca', shopify: '', notes: 'wellington-altus.ca from Notion' },
    { name: 'SplashTown Water Parks', contact: 'Dereck S', email: '', source: 'direct', status: 'active', platform: 'wordpress', wp: '', shopify: '', notes: 'Deployed at tournament.ashbi.ca (tournament manager) + main website' },
    { name: 'Clypse Beauty', contact: '', email: '', source: 'direct', status: 'completed', platform: 'wordpress', wp: '', shopify: '', notes: 'Portfolio project — web design' },
    { name: 'Tyson Media Productions', contact: '', email: '', source: 'direct', status: 'completed', platform: 'wordpress', wp: '', shopify: '', notes: 'Video production website' },
    { name: 'Arcan Painting', contact: '', email: '', source: 'direct', status: 'completed', platform: 'wordpress', wp: '', shopify: '', notes: 'GitHub repo exists — camster91/Arcan-Painting' },
    { name: 'ILM Digital Mailroom', contact: '', email: '', source: 'direct', status: 'active', platform: 'other', wp: '', shopify: '', notes: 'Deployed at ilm.ashbi.ca — static landing page' },
    { name: 'DuraBuild Contracting', contact: '', email: '', source: 'direct', status: 'completed', platform: 'wordpress', wp: '', shopify: '', notes: 'Web design portfolio project' },
  ];

  for (const c of clients) {
    const result = insertClient.run(c.name, c.contact, c.email, c.source, c.status, c.platform, c.wp, c.shopify, c.notes);
    const clientId = result.lastInsertRowid as number;
    if (c.status === 'active') {
      insertProject.run(clientId, `${c.name} — Ongoing`, c.notes, 'active', c.platform === 'shopify' ? 'shopify' : c.platform === 'wordpress' ? 'wordpress' : 'other');
    }
  }

  const tasks = [
    ['Run health check on all Coolify apps', 'Check tournament, ecard, shift6, budget, bionic, ilm', 'queued', 'high', 'claw', 'infrastructure', null, null],
    ['Fix budget app health status on Coolify', 'Container shows exited:unhealthy — investigate', 'queued', 'medium', 'claw', 'infrastructure', null, null],
    ['PrintCup cart customization', 'Finish cart.liquid edits — product fees, setup fees, quantity breaks', 'queued', 'urgent', 'bernard', 'development', 1, 1],
    ['PrintCup Klaviyo email setup', 'Create Klaviyo email campaign templates', 'queued', 'high', 'bernard', 'development', 1, 1],
    ['Numan project revisions', 'Complete Rev 2 tasks from Notion board', 'queued', 'high', 'bernard', 'development', 2, 2],
    ['Numan product pages', 'Build out product pages per Notion specs', 'queued', 'medium', 'bernard', 'development', 2, 2],
    ['Della revisions', 'Handle revision requests from Notion', 'queued', 'medium', 'bernard', 'development', 4, 4],
    ['Della product pages', 'Create product pages per client specs', 'queued', 'medium', 'bernard', 'development', 4, 4],
    ['Write blog post: 5 WordPress Speed Tips', 'SEO post for ashbi.ca', 'queued', 'medium', 'vale', 'content', null, null],
    ['Update Upwork profile', 'Add latest projects to portfolio', 'queued', 'low', 'vale', 'marketing', null, null],
    ['Draft weekly client status updates', 'Prepare summaries for all active clients', 'queued', 'high', 'gumbo', 'admin', null, null],
    ['Organize client files', 'Audit and organize all client project files', 'queued', 'medium', 'gumbo', 'admin', null, null],
    ['Set up automated backups for Coolify', 'Daily DB backups for all SQLite apps', 'queued', 'high', 'claw', 'infrastructure', null, null],
    ['Optimize ashbi.ca page speed', 'Run Lighthouse audit, fix critical issues', 'queued', 'high', 'bernard', 'development', null, null],
    ['Create SplashTown case study', 'Portfolio case study with before/after', 'queued', 'low', 'vale', 'content', 11, null],
    ['National Enquirer updates', 'Complete current sprint of updates', 'queued', 'high', 'bernard', 'development', 8, null],
    ['4EVRstrong WordPress updates', 'WordPress maintenance and updates', 'queued', 'medium', 'bernard', 'development', 6, null],
    ['Brushamania site updates', 'Review and update brushamania.ca', 'queued', 'medium', 'bernard', 'development', 5, null],
  ];

  for (const t of tasks) {
    insertTask.run(...t);
  }

  const logInsert = db.prepare(`INSERT INTO activity_log (agent, action, detail) VALUES ('system', 'seeded', 'Initial data seeded')`);
  logInsert.run();
}

export default getDb;

export type Client = {
  id: number; name: string; contact_name: string; contact_email: string;
  source: string; status: string; platform: string;
  wp_login_url: string; wp_username: string; shopify_store: string;
  hosting_info: string; monthly_retainer: number; notes: string;
  created_at: string; updated_at: string;
};

export type Project = {
  id: number; client_id: number; name: string; description: string;
  status: string; project_type: string; budget: number;
  hours_estimated: number; hours_used: number; upwork_contract_id: string;
  due_date: string | null; created_at: string; updated_at: string; completed_at: string | null;
};

export type Task = {
  id: number; title: string; description: string;
  status: 'queued' | 'in_progress' | 'needs_info' | 'done' | 'blocked';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  agent: 'claw' | 'bernard' | 'vale' | 'gumbo' | 'unassigned';
  category: string; client_id: number | null; project_id: number | null;
  due_date: string | null; created_at: string; updated_at: string;
  completed_at: string | null; notes: string;
  requirements: string; agent_questions: string; agent_output: string;
  dispatch_count: number; last_dispatched_at: string | null;
  client_name?: string; project_name?: string;
};

export type Communication = {
  id: number; client_id: number | null; project_id: number | null;
  channel: string; direction: string; subject: string; summary: string;
  raw_content: string; from_name: string; from_address: string;
  action_needed: number; action_taken: number; created_at: string;
  client_name?: string;
};

export type ActivityLog = {
  id: number; task_id: number | null; client_id: number | null;
  project_id: number | null; agent: string | null; action: string;
  detail: string; created_at: string;
};
