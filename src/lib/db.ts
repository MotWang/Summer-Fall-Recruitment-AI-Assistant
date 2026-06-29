import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let _db: Database.Database | null = null;

function resolveDbPath() {
  const fromEnv = process.env.RECRUIT_DB_PATH;
  const p = fromEnv && fromEnv.length > 0 ? fromEnv : path.join(process.cwd(), "data", "recruit.db");
  fs.mkdirSync(path.dirname(p), { recursive: true });
  return p;
}

export function getDb(): Database.Database {
  if (_db) return _db;
  const dbPath = resolveDbPath();
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  migrate(db);
  _db = db;
  return db;
}

function migrate(db: Database.Database) {
  // —— Step 1: 建表（不含索引）——
  db.exec(`
    CREATE TABLE IF NOT EXISTS applications (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT NOT NULL,
      industry TEXT,
      location TEXT,
      season TEXT NOT NULL DEFAULT 'summer-2027',
      status TEXT NOT NULL DEFAULT 'wishlist',
      posted_at TEXT,
      deadline TEXT,
      applied_at TEXT,
      source_url TEXT,
      source_type TEXT,
      jd_raw TEXT,
      jd_summary TEXT,
      keywords TEXT,
      salary TEXT,
      notes TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
      round INTEGER NOT NULL DEFAULT 1,
      kind TEXT NOT NULL DEFAULT 'other',
      scheduled_at TEXT,
      duration_minutes INTEGER,
      interviewer TEXT,
      outcome TEXT NOT NULL DEFAULT 'pending',
      questions TEXT,
      self_notes TEXT,
      reflection TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_docs (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      structured TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS profile_entries (
      id TEXT PRIMARY KEY,
      module TEXT NOT NULL,                  -- basic | internship | project | campus | award | skill | reflection
      title TEXT NOT NULL,                   -- e.g. 项目名 / 公司 · 岗位 / 奖项名
      org TEXT,                              -- 单位 / 学校 / 颁发方
      role TEXT,                             -- 职位 / 担任角色
      start_date TEXT,                       -- yyyy-MM 或 yyyy-MM-dd
      end_date TEXT,                         -- yyyy-MM / yyyy-MM-dd / 'present'
      location TEXT,
      summary TEXT,
      bullets TEXT,                          -- JSON array of string
      tags TEXT,                             -- JSON array of string
      links TEXT,                            -- JSON array of {label,url}
      source TEXT NOT NULL DEFAULT 'manual', -- manual | pdf | docx | text
      source_doc_id TEXT,                    -- 关联 profile_docs.id（如有）
      status TEXT NOT NULL DEFAULT 'active', -- active | draft (来自 AI 待用户确认)
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS shared_experiences (
      id TEXT PRIMARY KEY,
      company TEXT NOT NULL,
      role TEXT,
      season TEXT,
      source TEXT,
      contributor TEXT,
      stage TEXT,
      application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      content TEXT NOT NULL,
      highlights TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS ai_artifacts (
      id TEXT PRIMARY KEY,
      application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
      kind TEXT NOT NULL,
      title TEXT NOT NULL,
      input_ref TEXT,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS app_settings (
      k TEXT PRIMARY KEY,
      v TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  // —— Step 2: 软迁移老 DB（必须在索引之前）——
  const cols = db.prepare(`PRAGMA table_info(shared_experiences)`).all() as { name: string }[];
  if (!cols.some((c) => c.name === "application_id")) {
    db.exec(
      `ALTER TABLE shared_experiences ADD COLUMN application_id TEXT REFERENCES applications(id) ON DELETE SET NULL`,
    );
  }

  // —— Step 3: 建索引 ——
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_apps_status ON applications(status);
    CREATE INDEX IF NOT EXISTS idx_apps_company ON applications(company);
    CREATE INDEX IF NOT EXISTS idx_interviews_app ON interviews(application_id);
    CREATE INDEX IF NOT EXISTS idx_shared_company ON shared_experiences(company);
    CREATE INDEX IF NOT EXISTS idx_shared_app ON shared_experiences(application_id);
    CREATE INDEX IF NOT EXISTS idx_profile_entries_module ON profile_entries(module);
    CREATE INDEX IF NOT EXISTS idx_profile_entries_status ON profile_entries(status);
  `);
}

export function nowIso(): string {
  return new Date().toISOString();
}

export function newId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}_${Date.now().toString(36)}${rand}`;
}
