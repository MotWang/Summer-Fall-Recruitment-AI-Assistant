import { getDb, newId, nowIso } from "./db";
import type {
  AiArtifact,
  AppSettings,
  Application,
  Interview,
  ProfileDoc,
  ProfileEntry,
  ProfileModule,
  SharedExperience,
} from "./types";

// -------- Application ----------

type AppRow = {
  id: string;
  company: string;
  role: string;
  industry: string | null;
  location: string | null;
  season: string;
  status: string;
  posted_at: string | null;
  deadline: string | null;
  applied_at: string | null;
  source_url: string | null;
  source_type: string | null;
  jd_raw: string | null;
  jd_summary: string | null;
  keywords: string | null;
  salary: string | null;
  notes: string | null;
  resume_variant: string | null;
  created_at: string;
  updated_at: string;
};

function rowToApp(r: AppRow): Application {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    industry: r.industry,
    location: r.location,
    season: r.season as Application["season"],
    status: r.status as Application["status"],
    postedAt: r.posted_at,
    deadline: r.deadline,
    appliedAt: r.applied_at,
    sourceUrl: r.source_url,
    sourceType: (r.source_type as Application["sourceType"]) ?? null,
    jdRaw: r.jd_raw,
    jdSummary: r.jd_summary,
    keywords: r.keywords ? safeJson<string[]>(r.keywords, []) : [],
    salary: r.salary,
    notes: r.notes,
    resumeVariant: (r.resume_variant as Application["resumeVariant"]) ?? null,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

function safeJson<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function safeStringArray(s: string | null): string[] {
  if (!s) return [];
  try {
    const v = JSON.parse(s) as unknown;
    if (Array.isArray(v)) return v.map(String).filter(Boolean);
    if (typeof v === "string" && v.trim()) return [v.trim()];
    return [];
  } catch {
    return s.trim() ? [s.trim()] : [];
  }
}

export function listApplications(filter?: {
  status?: Application["status"];
  search?: string;
}): Application[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.status) {
    where.push("status = @status");
    params.status = filter.status;
  }
  if (filter?.search) {
    where.push("(company LIKE @q OR role LIKE @q OR location LIKE @q)");
    params.q = `%${filter.search}%`;
  }
  const sql = `SELECT * FROM applications ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC`;
  return (db.prepare(sql).all(params) as AppRow[]).map(rowToApp);
}

export function getApplication(id: string): Application | null {
  const db = getDb();
  const row = db.prepare("SELECT * FROM applications WHERE id = ?").get(id) as AppRow | undefined;
  return row ? rowToApp(row) : null;
}

export function createApplication(input: Partial<Application> & { company: string; role: string }): Application {
  const db = getDb();
  const id = newId("app");
  const now = nowIso();
  db.prepare(
    `INSERT INTO applications
      (id, company, role, industry, location, season, status, posted_at, deadline, applied_at,
       source_url, source_type, jd_raw, jd_summary, keywords, salary, notes, resume_variant, created_at, updated_at)
     VALUES
      (@id, @company, @role, @industry, @location, @season, @status, @posted_at, @deadline, @applied_at,
       @source_url, @source_type, @jd_raw, @jd_summary, @keywords, @salary, @notes, @resume_variant, @created_at, @updated_at)`
  ).run({
    id,
    company: input.company,
    role: input.role,
    industry: input.industry ?? null,
    location: input.location ?? null,
    // season "": 表示 AI 推断不出，留空交用户。空字符串原样落库。
    season: input.season ?? "",
    status: input.status ?? "wishlist",
    posted_at: input.postedAt ?? null,
    deadline: input.deadline ?? null,
    applied_at: input.appliedAt ?? null,
    source_url: input.sourceUrl ?? null,
    source_type: input.sourceType ?? null,
    jd_raw: input.jdRaw ?? null,
    jd_summary: input.jdSummary ?? null,
    keywords: input.keywords ? JSON.stringify(input.keywords) : null,
    salary: input.salary ?? null,
    notes: input.notes ?? null,
    resume_variant: input.resumeVariant ?? null,
    created_at: now,
    updated_at: now,
  });
  return getApplication(id)!;
}

export function updateApplication(id: string, patch: Partial<Application>): Application | null {
  const existing = getApplication(id);
  if (!existing) return null;
  const merged: Application = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
  const db = getDb();
  db.prepare(
    `UPDATE applications SET
       company=@company, role=@role, industry=@industry, location=@location, season=@season, status=@status,
       posted_at=@posted_at, deadline=@deadline, applied_at=@applied_at,
       source_url=@source_url, source_type=@source_type,
       jd_raw=@jd_raw, jd_summary=@jd_summary, keywords=@keywords, salary=@salary, notes=@notes,
       resume_variant=@resume_variant,
       updated_at=@updated_at
     WHERE id=@id`
  ).run({
    id: merged.id,
    company: merged.company,
    role: merged.role,
    industry: merged.industry ?? null,
    location: merged.location ?? null,
    season: merged.season,
    status: merged.status,
    posted_at: merged.postedAt ?? null,
    deadline: merged.deadline ?? null,
    applied_at: merged.appliedAt ?? null,
    source_url: merged.sourceUrl ?? null,
    source_type: merged.sourceType ?? null,
    jd_raw: merged.jdRaw ?? null,
    jd_summary: merged.jdSummary ?? null,
    keywords: merged.keywords ? JSON.stringify(merged.keywords) : null,
    salary: merged.salary ?? null,
    notes: merged.notes ?? null,
    resume_variant: merged.resumeVariant ?? null,
    updated_at: merged.updatedAt,
  });
  return getApplication(id);
}

export function deleteApplication(id: string): boolean {
  const db = getDb();
  const r = db.prepare("DELETE FROM applications WHERE id = ?").run(id);
  return r.changes > 0;
}

// -------- Interview ----------

type IntvRow = {
  id: string;
  application_id: string;
  round: number;
  kind: string;
  scheduled_at: string | null;
  duration_minutes: number | null;
  interviewer: string | null;
  outcome: string;
  questions: string | null;
  self_notes: string | null;
  reflection: string | null;
  created_at: string;
  updated_at: string;
};

function rowToIntv(r: IntvRow): Interview {
  return {
    id: r.id,
    applicationId: r.application_id,
    round: r.round,
    kind: r.kind as Interview["kind"],
    scheduledAt: r.scheduled_at,
    durationMinutes: r.duration_minutes,
    interviewer: r.interviewer,
    outcome: r.outcome as Interview["outcome"],
    questions: r.questions,
    selfNotes: r.self_notes,
    reflection: r.reflection,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listInterviews(applicationId?: string): Interview[] {
  const db = getDb();
  const rows = applicationId
    ? (db
        .prepare("SELECT * FROM interviews WHERE application_id = ? ORDER BY round ASC, scheduled_at ASC")
        .all(applicationId) as IntvRow[])
    : (db.prepare("SELECT * FROM interviews ORDER BY scheduled_at DESC").all() as IntvRow[]);
  return rows.map(rowToIntv);
}

export function getInterview(id: string): Interview | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM interviews WHERE id = ?").get(id) as IntvRow | undefined;
  return r ? rowToIntv(r) : null;
}

export function createInterview(input: Partial<Interview> & { applicationId: string }): Interview {
  const db = getDb();
  const id = newId("intv");
  const now = nowIso();
  db.prepare(
    `INSERT INTO interviews
      (id, application_id, round, kind, scheduled_at, duration_minutes, interviewer, outcome,
       questions, self_notes, reflection, created_at, updated_at)
     VALUES (@id,@app,@round,@kind,@scheduled,@dur,@interviewer,@outcome,@q,@sn,@ref,@c,@u)`
  ).run({
    id,
    app: input.applicationId,
    round: input.round ?? 1,
    kind: input.kind ?? "other",
    scheduled: input.scheduledAt ?? null,
    dur: input.durationMinutes ?? null,
    interviewer: input.interviewer ?? null,
    outcome: input.outcome ?? "pending",
    q: input.questions ?? null,
    sn: input.selfNotes ?? null,
    ref: input.reflection ?? null,
    c: now,
    u: now,
  });
  // 自动把对应 application 状态升级为 interviewing（仅当当前状态在投递前）
  const app = getApplication(input.applicationId);
  if (app && (app.status === "wishlist" || app.status === "applied" || app.status === "om_assessment")) {
    updateApplication(app.id, { status: "interviewing" });
  }
  return getInterview(id)!;
}

export function updateInterview(id: string, patch: Partial<Interview>): Interview | null {
  const existing = getInterview(id);
  if (!existing) return null;
  const m: Interview = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
  const db = getDb();
  db.prepare(
    `UPDATE interviews SET
       round=@round, kind=@kind, scheduled_at=@scheduled, duration_minutes=@dur, interviewer=@interviewer,
       outcome=@outcome, questions=@q, self_notes=@sn, reflection=@ref, updated_at=@u
     WHERE id=@id`
  ).run({
    id: m.id,
    round: m.round,
    kind: m.kind,
    scheduled: m.scheduledAt ?? null,
    dur: m.durationMinutes ?? null,
    interviewer: m.interviewer ?? null,
    outcome: m.outcome,
    q: m.questions ?? null,
    sn: m.selfNotes ?? null,
    ref: m.reflection ?? null,
    u: m.updatedAt,
  });
  return getInterview(id);
}

export function deleteInterview(id: string): boolean {
  const db = getDb();
  return db.prepare("DELETE FROM interviews WHERE id = ?").run(id).changes > 0;
}

// -------- ProfileDoc ----------

type DocRow = {
  id: string;
  kind: string;
  title: string;
  content: string;
  structured: string | null;
  created_at: string;
  updated_at: string;
};

function rowToDoc(r: DocRow): ProfileDoc {
  return {
    id: r.id,
    kind: r.kind as ProfileDoc["kind"],
    title: r.title,
    content: r.content,
    structured: r.structured ? safeJson(r.structured, {}) : undefined,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listProfileDocs(): ProfileDoc[] {
  const db = getDb();
  return (db.prepare("SELECT * FROM profile_docs ORDER BY updated_at DESC").all() as DocRow[]).map(rowToDoc);
}

export function getProfileDoc(id: string): ProfileDoc | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM profile_docs WHERE id = ?").get(id) as DocRow | undefined;
  return r ? rowToDoc(r) : null;
}

export function createProfileDoc(input: Omit<ProfileDoc, "id" | "createdAt" | "updatedAt">): ProfileDoc {
  const db = getDb();
  const id = newId("doc");
  const now = nowIso();
  db.prepare(
    `INSERT INTO profile_docs (id,kind,title,content,structured,created_at,updated_at)
     VALUES (@id,@kind,@title,@content,@structured,@c,@u)`
  ).run({
    id,
    kind: input.kind,
    title: input.title,
    content: input.content,
    structured: input.structured ? JSON.stringify(input.structured) : null,
    c: now,
    u: now,
  });
  return getProfileDoc(id)!;
}

export function updateProfileDoc(id: string, patch: Partial<ProfileDoc>): ProfileDoc | null {
  const existing = getProfileDoc(id);
  if (!existing) return null;
  const m = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
  const db = getDb();
  db.prepare(
    `UPDATE profile_docs SET kind=@kind,title=@title,content=@content,structured=@structured,updated_at=@u WHERE id=@id`
  ).run({
    id: m.id,
    kind: m.kind,
    title: m.title,
    content: m.content,
    structured: m.structured ? JSON.stringify(m.structured) : null,
    u: m.updatedAt,
  });
  return getProfileDoc(id);
}

export function deleteProfileDoc(id: string): boolean {
  return getDb().prepare("DELETE FROM profile_docs WHERE id=?").run(id).changes > 0;
}

// -------- SharedExperience ----------

type ExpRow = {
  id: string;
  company: string;
  role: string | null;
  season: string | null;
  source: string | null;
  contributor: string | null;
  stage: string | null;
  application_id: string | null;
  content: string;
  highlights: string | null;
  created_at: string;
  updated_at: string;
};

function rowToExp(r: ExpRow): SharedExperience {
  return {
    id: r.id,
    company: r.company,
    role: r.role,
    season: (r.season as SharedExperience["season"]) ?? null,
    source: r.source,
    contributor: r.contributor,
    stage: r.stage,
    applicationId: r.application_id,
    content: r.content,
    highlights: safeStringArray(r.highlights),
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listSharedExperiences(filter?: {
  company?: string;
  applicationId?: string;
}): SharedExperience[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.company) {
    where.push("company LIKE @c");
    params.c = `%${filter.company}%`;
  }
  if (filter?.applicationId) {
    where.push("application_id = @aid");
    params.aid = filter.applicationId;
  }
  const sql = `SELECT * FROM shared_experiences ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY updated_at DESC`;
  return (db.prepare(sql).all(params) as ExpRow[]).map(rowToExp);
}

export function getSharedExperience(id: string): SharedExperience | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM shared_experiences WHERE id = ?").get(id) as ExpRow | undefined;
  return r ? rowToExp(r) : null;
}

export function createSharedExperience(
  input: Omit<SharedExperience, "id" | "createdAt" | "updatedAt">,
): SharedExperience {
  const db = getDb();
  const id = newId("exp");
  const now = nowIso();
  // 自动绑定：若未指定 applicationId 但存在同名公司投递，绑定到最近 updatedAt 的那一条
  let appId: string | null = input.applicationId ?? null;
  if (!appId) {
    const match = db
      .prepare(
        "SELECT id FROM applications WHERE lower(company) = lower(?) ORDER BY updated_at DESC LIMIT 1",
      )
      .get(input.company) as { id: string } | undefined;
    if (match) appId = match.id;
  }
  db.prepare(
    `INSERT INTO shared_experiences (id,company,role,season,source,contributor,stage,application_id,content,highlights,created_at,updated_at)
     VALUES (@id,@company,@role,@season,@source,@contributor,@stage,@app,@content,@hl,@c,@u)`,
  ).run({
    id,
    company: input.company,
    role: input.role ?? null,
    season: input.season ?? null,
    source: input.source ?? null,
    contributor: input.contributor ?? null,
    stage: input.stage ?? null,
    app: appId,
    content: input.content,
    hl: input.highlights ? JSON.stringify(input.highlights) : null,
    c: now,
    u: now,
  });
  return getSharedExperience(id)!;
}

export function updateSharedExperience(
  id: string,
  patch: Partial<SharedExperience>,
): SharedExperience | null {
  const existing = getSharedExperience(id);
  if (!existing) return null;
  const m: SharedExperience = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
  getDb()
    .prepare(
      `UPDATE shared_experiences SET
        company=@company, role=@role, season=@season, source=@source, contributor=@contributor,
        stage=@stage, application_id=@app, content=@content, highlights=@hl, updated_at=@u
      WHERE id=@id`,
    )
    .run({
      id: m.id,
      company: m.company,
      role: m.role ?? null,
      season: m.season ?? null,
      source: m.source ?? null,
      contributor: m.contributor ?? null,
      stage: m.stage ?? null,
      app: m.applicationId ?? null,
      content: m.content,
      hl: m.highlights ? JSON.stringify(m.highlights) : null,
      u: m.updatedAt,
    });
  return getSharedExperience(id);
}

export function deleteSharedExperience(id: string): boolean {
  return getDb().prepare("DELETE FROM shared_experiences WHERE id=?").run(id).changes > 0;
}

// -------- AI artifact ----------

type ArtRow = {
  id: string;
  application_id: string | null;
  kind: string;
  title: string;
  input_ref: string | null;
  content: string;
  created_at: string;
};

function rowToArt(r: ArtRow): AiArtifact {
  return {
    id: r.id,
    applicationId: r.application_id,
    kind: r.kind as AiArtifact["kind"],
    title: r.title,
    inputRef: r.input_ref,
    content: r.content,
    createdAt: r.created_at,
  };
}

export function listAiArtifacts(applicationId?: string): AiArtifact[] {
  const db = getDb();
  const rows = applicationId
    ? (db
        .prepare("SELECT * FROM ai_artifacts WHERE application_id = ? ORDER BY created_at DESC")
        .all(applicationId) as ArtRow[])
    : (db.prepare("SELECT * FROM ai_artifacts ORDER BY created_at DESC").all() as ArtRow[]);
  return rows.map(rowToArt);
}

export function getAiArtifact(id: string): AiArtifact | null {
  const r = getDb().prepare("SELECT * FROM ai_artifacts WHERE id = ?").get(id) as ArtRow | undefined;
  return r ? rowToArt(r) : null;
}

export function createAiArtifact(input: Omit<AiArtifact, "id" | "createdAt">): AiArtifact {
  const db = getDb();
  const id = newId("art");
  const now = nowIso();
  db.prepare(
    `INSERT INTO ai_artifacts (id,application_id,kind,title,input_ref,content,created_at)
     VALUES (@id,@app,@kind,@title,@ref,@content,@c)`
  ).run({
    id,
    app: input.applicationId ?? null,
    kind: input.kind,
    title: input.title,
    ref: input.inputRef ?? null,
    content: input.content,
    c: now,
  });
  return { ...input, id, createdAt: now } as AiArtifact;
}

export function deleteAiArtifact(id: string): boolean {
  return getDb().prepare("DELETE FROM ai_artifacts WHERE id=?").run(id).changes > 0;
}

// -------- Stats / Export ----------

export function getStats() {
  const db = getDb();
  const counts = db
    .prepare("SELECT status, COUNT(*) as n FROM applications GROUP BY status")
    .all() as { status: string; n: number }[];
  const upcoming = db
    .prepare(
      `SELECT i.*, a.company, a.role FROM interviews i
       JOIN applications a ON a.id = i.application_id
       WHERE i.scheduled_at IS NOT NULL AND date(i.scheduled_at) >= date('now')
       ORDER BY i.scheduled_at ASC LIMIT 8`
    )
    .all();
  const totalApps = (db.prepare("SELECT COUNT(*) as n FROM applications").get() as { n: number }).n;
  const totalIntv = (db.prepare("SELECT COUNT(*) as n FROM interviews").get() as { n: number }).n;
  return { counts, upcoming, totalApps, totalIntv };
}

export function exportAll() {
  return {
    exportedAt: nowIso(),
    applications: listApplications(),
    interviews: listInterviews(),
    profileDocs: listProfileDocs(),
    profileEntries: listProfileEntries(),
    sharedExperiences: listSharedExperiences(),
    aiArtifacts: listAiArtifacts(),
    settings: getAppSettings(),
  };
}

// -------- ProfileEntry ----------

type EntryRow = {
  id: string;
  module: string;
  title: string;
  org: string | null;
  role: string | null;
  start_date: string | null;
  end_date: string | null;
  location: string | null;
  summary: string | null;
  bullets: string | null;
  tags: string | null;
  links: string | null;
  source: string;
  source_doc_id: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};

function rowToEntry(r: EntryRow): ProfileEntry {
  return {
    id: r.id,
    module: r.module as ProfileModule,
    title: r.title,
    org: r.org,
    role: r.role,
    startDate: r.start_date,
    endDate: r.end_date,
    location: r.location,
    summary: r.summary,
    bullets: r.bullets ? safeJson<string[]>(r.bullets, []) : [],
    tags: r.tags ? safeJson<string[]>(r.tags, []) : [],
    links: r.links ? safeJson<ProfileEntry["links"]>(r.links, []) : [],
    source: r.source as ProfileEntry["source"],
    sourceDocId: r.source_doc_id,
    status: r.status as ProfileEntry["status"],
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  };
}

export function listProfileEntries(filter?: {
  module?: ProfileModule;
  status?: ProfileEntry["status"];
}): ProfileEntry[] {
  const db = getDb();
  const where: string[] = [];
  const params: Record<string, unknown> = {};
  if (filter?.module) {
    where.push("module = @m");
    params.m = filter.module;
  }
  if (filter?.status) {
    where.push("status = @s");
    params.s = filter.status;
  }
  const sql = `SELECT * FROM profile_entries ${where.length ? "WHERE " + where.join(" AND ") : ""}
               ORDER BY
                 CASE WHEN end_date IS NULL OR end_date = 'present' THEN '9999-99' ELSE end_date END DESC,
                 start_date DESC NULLS LAST,
                 updated_at DESC`;
  return (db.prepare(sql).all(params) as EntryRow[]).map(rowToEntry);
}

export function getProfileEntry(id: string): ProfileEntry | null {
  const db = getDb();
  const r = db.prepare("SELECT * FROM profile_entries WHERE id = ?").get(id) as EntryRow | undefined;
  return r ? rowToEntry(r) : null;
}

export function createProfileEntry(
  input: Omit<ProfileEntry, "id" | "createdAt" | "updatedAt"> & { id?: string },
): ProfileEntry {
  const db = getDb();
  const id = input.id ?? newId("ent");
  const now = nowIso();
  db.prepare(
    `INSERT INTO profile_entries
       (id, module, title, org, role, start_date, end_date, location, summary,
        bullets, tags, links, source, source_doc_id, status, created_at, updated_at)
     VALUES
       (@id,@module,@title,@org,@role,@start,@end,@loc,@summary,
        @bullets,@tags,@links,@source,@srcDoc,@status,@c,@u)`,
  ).run({
    id,
    module: input.module,
    title: input.title,
    org: input.org ?? null,
    role: input.role ?? null,
    start: input.startDate ?? null,
    end: input.endDate ?? null,
    loc: input.location ?? null,
    summary: input.summary ?? null,
    bullets: input.bullets ? JSON.stringify(input.bullets) : null,
    tags: input.tags ? JSON.stringify(input.tags) : null,
    links: input.links ? JSON.stringify(input.links) : null,
    source: input.source,
    srcDoc: input.sourceDocId ?? null,
    status: input.status,
    c: now,
    u: now,
  });
  return getProfileEntry(id)!;
}

export function updateProfileEntry(id: string, patch: Partial<ProfileEntry>): ProfileEntry | null {
  const existing = getProfileEntry(id);
  if (!existing) return null;
  const m: ProfileEntry = { ...existing, ...patch, id: existing.id, updatedAt: nowIso() };
  getDb()
    .prepare(
      `UPDATE profile_entries SET
        module=@module, title=@title, org=@org, role=@role,
        start_date=@start, end_date=@end, location=@loc, summary=@summary,
        bullets=@bullets, tags=@tags, links=@links,
        source=@source, source_doc_id=@srcDoc, status=@status, updated_at=@u
       WHERE id=@id`,
    )
    .run({
      id: m.id,
      module: m.module,
      title: m.title,
      org: m.org ?? null,
      role: m.role ?? null,
      start: m.startDate ?? null,
      end: m.endDate ?? null,
      loc: m.location ?? null,
      summary: m.summary ?? null,
      bullets: m.bullets ? JSON.stringify(m.bullets) : null,
      tags: m.tags ? JSON.stringify(m.tags) : null,
      links: m.links ? JSON.stringify(m.links) : null,
      source: m.source,
      srcDoc: m.sourceDocId ?? null,
      status: m.status,
      u: m.updatedAt,
    });
  return getProfileEntry(id);
}

export function deleteProfileEntry(id: string): boolean {
  return getDb().prepare("DELETE FROM profile_entries WHERE id=?").run(id).changes > 0;
}

/** 检测一条 AI 抽取的条目和已有条目是否疑似重复。
 *  返回 0..1 相似度：1=极可能重复；> 0.55 触发"合并/替换"对话框。
 */
export function suggestMatchForEntry(candidate: Partial<ProfileEntry>): {
  match: ProfileEntry | null;
  similarity: number;
} {
  if (!candidate.module) return { match: null, similarity: 0 };
  const existing = listProfileEntries({ module: candidate.module });
  let best: ProfileEntry | null = null;
  let bestScore = 0;
  for (const e of existing) {
    const sTitle = textSim(candidate.title, e.title);
    const sOrg = textSim(candidate.org, e.org);
    const sTime = dateOverlap(candidate.startDate, e.startDate);
    const score = sTitle * 0.5 + sOrg * 0.3 + sTime * 0.2;
    if (score > bestScore) {
      bestScore = score;
      best = e;
    }
  }
  return { match: bestScore > 0.55 ? best : null, similarity: bestScore };
}

function textSim(a?: string | null, b?: string | null): number {
  if (!a || !b) return 0;
  const A = a.toLowerCase().trim();
  const B = b.toLowerCase().trim();
  if (A === B) return 1;
  if (A.includes(B) || B.includes(A)) return 0.85;
  const ag = new Set(A.split(/\s+|·|\-|\//).filter(Boolean));
  const bg = new Set(B.split(/\s+|·|\-|\//).filter(Boolean));
  if (!ag.size || !bg.size) return 0;
  let hit = 0;
  for (const x of ag) if (bg.has(x)) hit++;
  return hit / Math.max(ag.size, bg.size);
}

function dateOverlap(a1?: string | null, b1?: string | null): number {
  if (!a1 && !b1) return 0;
  if (a1 && b1 && a1.slice(0, 7) === b1.slice(0, 7)) return 1;
  return 0;
}

// -------- App settings ----------

export function getAppSettings(): AppSettings {
  const db = getDb();
  const rows = db.prepare("SELECT k,v FROM app_settings").all() as { k: string; v: string }[];
  const obj: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      obj[r.k] = JSON.parse(r.v);
    } catch {
      obj[r.k] = r.v;
    }
  }
  return obj as AppSettings;
}

export function setAppSettings(patch: Partial<AppSettings>): AppSettings {
  const db = getDb();
  const now = nowIso();
  const stmt = db.prepare(
    `INSERT INTO app_settings(k,v,updated_at) VALUES (@k,@v,@u)
     ON CONFLICT(k) DO UPDATE SET v=excluded.v, updated_at=excluded.updated_at`,
  );
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined) continue;
    stmt.run({ k, v: JSON.stringify(v), u: now });
  }
  return getAppSettings();
}
