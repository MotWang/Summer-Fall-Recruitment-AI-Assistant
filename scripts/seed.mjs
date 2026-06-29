// 简单的 seed 脚本：往本地 DB 塞几条示例数据，方便首次启动时看到内容
import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = process.env.RECRUIT_DB_PATH || path.join(__dirname, "..", "data", "recruit.db");
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// schema 必须与 src/lib/db.ts 保持一致；这里同时跑一次 ALTER 保证旧 DB 升级
db.exec(`
  CREATE TABLE IF NOT EXISTS applications (
    id TEXT PRIMARY KEY, company TEXT NOT NULL, role TEXT NOT NULL,
    industry TEXT, location TEXT, season TEXT NOT NULL DEFAULT 'summer-2027',
    status TEXT NOT NULL DEFAULT 'wishlist',
    posted_at TEXT, deadline TEXT, applied_at TEXT,
    source_url TEXT, source_type TEXT, jd_raw TEXT, jd_summary TEXT,
    keywords TEXT, salary TEXT, notes TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS interviews (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
    round INTEGER NOT NULL DEFAULT 1, kind TEXT NOT NULL DEFAULT 'other',
    scheduled_at TEXT, duration_minutes INTEGER, interviewer TEXT,
    outcome TEXT NOT NULL DEFAULT 'pending',
    questions TEXT, self_notes TEXT, reflection TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profile_docs (
    id TEXT PRIMARY KEY, kind TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
    structured TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS profile_entries (
    id TEXT PRIMARY KEY, module TEXT NOT NULL, title TEXT NOT NULL,
    org TEXT, role TEXT, start_date TEXT, end_date TEXT, location TEXT, summary TEXT,
    bullets TEXT, tags TEXT, links TEXT,
    source TEXT NOT NULL DEFAULT 'manual', source_doc_id TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS shared_experiences (
    id TEXT PRIMARY KEY, company TEXT NOT NULL, role TEXT, season TEXT, source TEXT,
    contributor TEXT, stage TEXT, application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    content TEXT NOT NULL, highlights TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS ai_artifacts (
    id TEXT PRIMARY KEY,
    application_id TEXT REFERENCES applications(id) ON DELETE SET NULL,
    kind TEXT NOT NULL, title TEXT NOT NULL, input_ref TEXT, content TEXT NOT NULL,
    created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS app_settings (k TEXT PRIMARY KEY, v TEXT NOT NULL, updated_at TEXT NOT NULL);
`);

// 软迁移：给旧 DB 的 shared_experiences 补 application_id 列
const cols = db.prepare(`PRAGMA table_info(shared_experiences)`).all();
if (!cols.some((c) => c.name === "application_id")) {
  db.exec(`ALTER TABLE shared_experiences ADD COLUMN application_id TEXT REFERENCES applications(id) ON DELETE SET NULL`);
}

const now = new Date().toISOString();
const id = (p) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

const samples = [
  {
    company: "Anthropic",
    role: "Product Designer (Intern)",
    industry: "AI",
    location: "San Francisco",
    season: "summer-2027",
    status: "wishlist",
    posted_at: "2026-06-01",
    deadline: "2026-08-15",
    jd_summary: "在 Claude 团队，参与对话产品的核心交互与品牌延展。",
    keywords: ["Figma", "Prototyping", "Design Systems"],
  },
  {
    company: "字节跳动",
    role: "数据分析师 - 暑期实习",
    industry: "互联网 / 软件",
    location: "上海",
    season: "summer-2027",
    status: "applied",
    posted_at: "2026-05-20",
    deadline: "2026-07-10",
    applied_at: "2026-06-25",
    jd_summary: "围绕电商业务做实验设计与漏斗分析。",
    keywords: ["SQL", "Python", "A/B testing"],
  },
  {
    company: "Goldman Sachs",
    role: "Investment Banking Summer Analyst",
    industry: "金融 / 投资",
    location: "Hong Kong",
    season: "summer-2027",
    status: "interviewing",
    posted_at: "2026-04-01",
    deadline: "2026-06-30",
    applied_at: "2026-06-05",
    jd_summary: "Coverage TMT, supporting M&A and ECM execution.",
    keywords: ["DCF", "Excel", "VBA"],
  },
];

const insApp = db.prepare(`INSERT INTO applications
  (id, company, role, industry, location, season, status, posted_at, deadline, applied_at,
   jd_summary, keywords, created_at, updated_at)
  VALUES (@id,@company,@role,@industry,@location,@season,@status,@posted_at,@deadline,@applied_at,
          @jd_summary,@keywords,@c,@u)`);

const appIds = samples.map((s) => {
  const aid = id("app");
  insApp.run({ ...s, id: aid, keywords: JSON.stringify(s.keywords), applied_at: s.applied_at ?? null, c: now, u: now });
  return aid;
});

const insIntv = db.prepare(`INSERT INTO interviews
  (id, application_id, round, kind, scheduled_at, outcome, questions, self_notes, created_at, updated_at)
  VALUES (@id,@a,@r,@k,@s,@o,@q,@n,@c,@u)`);

insIntv.run({
  id: id("intv"), a: appIds[2], r: 1, k: "phone_screen",
  s: "2026-07-08T14:00:00.000Z", o: "passed",
  q: "1. Walk me through a DCF.\n2. Why GS Hong Kong?\n3. Recent deal you find interesting?",
  n: "用 STAR 讲了 XX 项目；反向提问问了 team culture。", c: now, u: now,
});

const insExp = db.prepare(`INSERT INTO shared_experiences
  (id, company, role, stage, contributor, application_id, content, highlights, created_at, updated_at)
  VALUES (@id,@c,@r,@s,@ct,@app,@cn,@h,@ca,@ua)`);

insExp.run({
  id: id("exp"), c: "Goldman Sachs", r: "IBD Summer Analyst", s: "First round",
  ct: "学长 LinkedIn 分享", app: appIds[2],
  cn: "1. Walk me through your resume.\n2. Tell me about a recent IPO.\n3. Brainteaser: 18 marbles, find heavy one with 3 weighings.",
  h: JSON.stringify(["Walk me through your resume.", "Tell me about a recent IPO.", "Brainteaser: 18 marbles, 3 weighings."]),
  ca: now, ua: now,
});

// —— profile_entries 示例：1 个基本信息 + 1 个实习 + 1 个项目 + 1 个校内 ——
const insEnt = db.prepare(`INSERT INTO profile_entries
  (id, module, title, org, role, start_date, end_date, location, summary, bullets, tags, links, source, source_doc_id, status, created_at, updated_at)
  VALUES (@id,@m,@t,@o,@r,@s,@e,@l,@sm,@b,@tg,@lk,@src,@sd,@st,@c,@u)`);

const entries = [
  {
    m: "basic", t: "联系方式 & 教育背景", o: "清华大学", r: null,
    s: null, e: null, l: "北京",
    sm: "工商管理本科 · GPA 3.8 / 4.0", b: ["邮箱：student@example.com", "学校：清华大学经管学院"], tg: ["GPA 3.8"],
  },
  {
    m: "internship", t: "腾讯 · 战略投资部", o: "腾讯", r: "战略投资实习生",
    s: "2025-06", e: "2025-09", l: "深圳",
    sm: "TMT 行业研究 + 一二级估值模型搭建",
    b: [
      "完成 3 篇行业深度报告，覆盖 AI Infra / 电商 / 短剧赛道",
      "搭建 DCF 与可比公司模型，参与 2 笔 A 轮投资尽调",
      "组织 6 场创始人访谈，沉淀至内部知识库",
    ],
    tg: ["DCF", "行业研究", "TMT"],
  },
  {
    m: "project", t: "校园二手书交易平台 BookSwap", o: "个人项目", r: "全栈作者",
    s: "2024-09", e: "2025-01", l: null,
    sm: "Next.js + SQLite 的本地优先轻量交易站",
    b: [
      "PWA 离线可用，本科生用户 1.2k，月活 30%+",
      "实现基于位置的图书匹配算法，平均匹配时间 < 5 min",
    ],
    tg: ["Next.js", "TypeScript", "SQLite"],
  },
  {
    m: "campus", t: "经管学院学生会 · 学术部部长", o: "清华经管学生会", r: "学术部部长",
    s: "2024-09", e: "2025-06", l: "北京",
    sm: "组织 12 场学术讲座，平均到场率 85%",
    b: [
      "对接 8 位行业大咖嘉宾",
      "重构学术部知识库，使用 Notion 模板覆盖近 5 年讲座资料",
    ],
    tg: ["组织", "沟通"],
  },
];

for (const ent of entries) {
  insEnt.run({
    id: id("ent"),
    m: ent.m, t: ent.t, o: ent.o ?? null, r: ent.r ?? null,
    s: ent.s ?? null, e: ent.e ?? null, l: ent.l ?? null,
    sm: ent.sm ?? null,
    b: ent.b ? JSON.stringify(ent.b) : null,
    tg: ent.tg ? JSON.stringify(ent.tg) : null,
    lk: null, src: "manual", sd: null, st: "active",
    c: now, u: now,
  });
}

console.log(`seeded ${appIds.length} applications, ${entries.length} profile entries, 1 experience`);
db.close();
