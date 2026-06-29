"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useTransition } from "react";
import clsx from "clsx";
import {
  APPLICATION_STATUSES,
  type AiArtifact,
  type Application,
  type Interview,
  type SharedExperience,
} from "@/lib/types";
import { SectionTitle, STATUS_LABEL, StatusPill } from "@/components/ui";
import { Markdown } from "@/components/markdown";

const INTERVIEW_KINDS: { value: Interview["kind"]; label: string }[] = [
  { value: "online_assessment", label: "OA 笔试" },
  { value: "phone_screen", label: "电话初筛" },
  { value: "technical", label: "技术面" },
  { value: "behavioral", label: "Behavioral / HR" },
  { value: "case", label: "Case" },
  { value: "system_design", label: "System Design" },
  { value: "onsite", label: "Onsite" },
  { value: "final", label: "Final" },
  { value: "other", label: "其他" },
];

const OUTCOMES: { value: Interview["outcome"]; label: string }[] = [
  { value: "pending", label: "待定" },
  { value: "passed", label: "通过" },
  { value: "failed", label: "未通过" },
  { value: "cancelled", label: "取消" },
];

type Tab = "info" | "interviews" | "experiences" | "studio";

export function ApplicationDetail({
  app,
  interviews,
  artifacts,
  experiences,
}: {
  app: Application;
  interviews: Interview[];
  artifacts: AiArtifact[];
  experiences: SharedExperience[];
}) {
  const router = useRouter();
  const [busy, startTx] = useTransition();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Partial<Application>>({});
  const [aiLog, setAiLog] = useState<string>("");
  const [tab, setTab] = useState<Tab>("info");

  function patch(p: Partial<Application>) {
    startTx(async () => {
      await fetch(`/api/applications/${app.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(p),
      });
      router.refresh();
    });
  }

  function save() {
    if (Object.keys(draft).length === 0) {
      setEditing(false);
      return;
    }
    patch(draft);
    setDraft({});
    setEditing(false);
  }

  function remove() {
    if (!confirm(`确定删除「${app.company} · ${app.role}」？`)) return;
    startTx(async () => {
      await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
      router.push("/applications");
    });
  }

  async function runAi(kind: "resume_tailor" | "interview_prep") {
    setAiLog("生成中…");
    const r = await fetch(
      kind === "resume_tailor" ? "/api/ai/optimize-resume" : "/api/ai/prepare-interview",
      {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId: app.id }),
      },
    );
    const j = await r.json();
    setAiLog(j.ok ? "已生成 ✓" : `失败：${j.error}`);
    router.refresh();
  }

  return (
    <div>
      <SectionTitle
        eyebrow={`${app.industry ?? "—"}`}
        title={`${app.company} · ${app.role}`}
        subtitle={app.jdSummary ?? "暂未生成 JD 摘要。"}
        right={
          <div className="flex flex-wrap gap-2 justify-end">
            <Link href="/applications" className="btn-quiet">← 返回看板</Link>
            <button className="btn-ghost" onClick={() => setEditing((v) => !v)}>
              {editing ? "取消编辑" : "编辑"}
            </button>
            <button className="btn-ghost text-clay-600" onClick={remove}>
              删除
            </button>
          </div>
        }
      />

      <div className="grid lg:grid-cols-[1fr_320px] gap-8">
        {/* 主栏 */}
        <div className="space-y-6">
          <Tabs current={tab} onChange={setTab} counts={{
            interviews: interviews.length,
            experiences: experiences.length,
            studio: artifacts.length,
          }} />

          {tab === "info" && (
          <section className="surface p-6">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <StatusPill status={app.status} />
              {app.sourceUrl && (
                <a className="link text-xs" href={app.sourceUrl} target="_blank" rel="noreferrer">
                  原链接 ↗
                </a>
              )}
            </div>

            {editing ? (
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="公司">
                  <input className="input" defaultValue={app.company}
                    onChange={(e) => setDraft((d) => ({ ...d, company: e.target.value }))} />
                </Field>
                <Field label="岗位">
                  <input className="input" defaultValue={app.role}
                    onChange={(e) => setDraft((d) => ({ ...d, role: e.target.value }))} />
                </Field>
                <Field label="行业">
                  <input className="input" defaultValue={app.industry ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, industry: e.target.value }))} />
                </Field>
                <Field label="地点">
                  <input className="input" defaultValue={app.location ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, location: e.target.value }))} />
                </Field>
                <Field label="起始日期">
                  <input className="input" type="date" defaultValue={app.postedAt ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, postedAt: e.target.value }))} />
                </Field>
                <Field label="截止日期">
                  <input className="input" type="date" defaultValue={app.deadline ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, deadline: e.target.value }))} />
                </Field>
                <Field label="实际投递时间">
                  <input className="input" type="date" defaultValue={app.appliedAt?.slice(0, 10) ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, appliedAt: e.target.value }))} />
                </Field>
                <Field label="薪资">
                  <input className="input" defaultValue={app.salary ?? ""}
                    onChange={(e) => setDraft((d) => ({ ...d, salary: e.target.value }))} />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="备注">
                    <textarea className="textarea" defaultValue={app.notes ?? ""}
                      onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <button className="btn-primary" onClick={save} disabled={busy}>
                    保存
                  </button>
                </div>
              </div>
            ) : (
              <dl className="grid sm:grid-cols-2 gap-x-8 gap-y-3 text-sm">
                <Row k="行业" v={app.industry} />
                <Row k="地点" v={app.location} />
                <Row k="起始日期" v={app.postedAt} />
                <Row k="截止日期" v={app.deadline} highlight={!!app.deadline} />
                <Row k="实际投递" v={app.appliedAt?.slice(0, 10)} />
                <Row k="薪资" v={app.salary} />
                <Row k="季节" v={app.season} />
                <Row k="来源" v={app.sourceType ?? "manual"} />
                {app.notes && (
                  <div className="sm:col-span-2 pt-2 border-t border-ink-100">
                    <div className="field-label mb-1">备注</div>
                    <p className="text-ink-600 whitespace-pre-wrap">{app.notes}</p>
                  </div>
                )}
              </dl>
            )}

            {!!(app.keywords && app.keywords.length) && (
              <div className="mt-5">
                <div className="field-label mb-2">JD 关键词</div>
                <div className="flex flex-wrap gap-1.5">
                  {app.keywords.map((k) => (
                    <span key={k} className="pill border-ink-100 text-ink-500 bg-ivory-100">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </section>
          )}

          {tab === "interviews" && <InterviewSection appId={app.id} interviews={interviews} />}

          {tab === "experiences" && (
            <ExperienceSection
              appId={app.id}
              company={app.company}
              role={app.role}
              experiences={experiences}
            />
          )}

          {tab === "studio" && (
            <section className="surface p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="display-2">AI 工作台</h2>
                <div className="flex gap-2">
                  <button className="btn-ghost" onClick={() => runAi("resume_tailor")} disabled={busy}>
                    生成简历优化
                  </button>
                  <button className="btn-accent" onClick={() => runAi("interview_prep")} disabled={busy}>
                    生成面试准备
                  </button>
                </div>
              </div>
              {aiLog && <p className="text-xs text-ink-400 mb-3">{aiLog}</p>}
              {artifacts.length === 0 ? (
                <p className="text-ink-300 text-sm">
                  还没有生成过。简历优化会读取你的个人资料；面试准备会自动检索该公司的面经。
                </p>
              ) : (
                <ul className="space-y-4">
                  {artifacts.map((a) => (
                    <li key={a.id} className="border border-ink-100 rounded-xl p-4 bg-ivory-100/40">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <div className="label-eyebrow">
                            {a.kind === "resume_tailor" ? "RESUME TAILOR" : "INTERVIEW PREP"}
                          </div>
                          <div className="text-ink-700 font-medium">{a.title}</div>
                        </div>
                        <span className="text-xs text-ink-300">
                          {new Date(a.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <Markdown source={a.content} />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}
        </div>

        {/* 边栏：状态切换 + JD 原文 */}
        <aside className="space-y-6">
          <section className="surface p-5">
            <div className="field-label mb-3">状态</div>
            <div className="grid grid-cols-2 gap-2">
              {APPLICATION_STATUSES.map((s) => (
                <button
                  key={s}
                  onClick={() => patch({ status: s, appliedAt: s === "applied" && !app.appliedAt ? new Date().toISOString() : app.appliedAt })}
                  className={clsx(
                    "text-xs rounded-lg px-2.5 py-2 border transition text-left",
                    s === app.status
                      ? "border-clay-300 bg-clay-50 text-clay-700"
                      : "border-ink-100 bg-ivory-50 text-ink-500 hover:border-ink-200",
                  )}
                  disabled={busy}
                >
                  {STATUS_LABEL[s]}
                </button>
              ))}
            </div>
          </section>

          {app.jdRaw && (
            <section className="surface p-5">
              <div className="flex items-center justify-between mb-2">
                <div className="field-label">JD 原文</div>
                <span className="text-[10px] text-ink-300">{app.jdRaw.length} chars</span>
              </div>
              <pre className="text-[12px] text-ink-500 whitespace-pre-wrap max-h-[520px] overflow-auto">
                {app.jdRaw}
              </pre>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function Tabs({
  current,
  onChange,
  counts,
}: {
  current: Tab;
  onChange: (t: Tab) => void;
  counts: { interviews: number; experiences: number; studio: number };
}) {
  const items: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: "info", label: "信息" },
    { id: "interviews", label: "面试", badge: counts.interviews },
    { id: "experiences", label: "面经", badge: counts.experiences },
    { id: "studio", label: "AI 工作台", badge: counts.studio },
  ];
  return (
    <div className="flex gap-1 border-b border-ink-100">
      {items.map((it) => (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          className={clsx(
            "px-4 py-2.5 text-sm transition border-b-2 -mb-px",
            current === it.id
              ? "border-clay-400 text-ink-800"
              : "border-transparent text-ink-400 hover:text-ink-700",
          )}
        >
          {it.label}
          {it.badge !== undefined && it.badge > 0 && (
            <span className="ml-1.5 text-[10px] text-ink-400">{it.badge}</span>
          )}
        </button>
      ))}
    </div>
  );
}

function ExperienceSection({
  appId,
  company,
  role,
  experiences,
}: {
  appId: string;
  company: string;
  role: string;
  experiences: SharedExperience[];
}) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [stage, setStage] = useState("");
  const [contributor, setContributor] = useState("");
  const [content, setContent] = useState("");

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/experiences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawContent: content,
          company,
          role,
          stage: stage || undefined,
          contributor: contributor || undefined,
          applicationId: appId,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setContent("");
      setShowForm(false);
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function unbind(id: string) {
    await fetch(`/api/experiences/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId: null }),
    });
    router.refresh();
  }

  async function bind(id: string) {
    await fetch(`/api/experiences/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ applicationId: appId }),
    });
    router.refresh();
  }

  async function del(id: string) {
    if (!confirm("删除这份面经？")) return;
    await fetch(`/api/experiences/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <section className="surface p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="display-2">面经</h2>
          <p className="text-xs text-ink-400 mt-1">
            自动关联 {company} 的所有面经；新建会绑定到当前投递。
          </p>
        </div>
        <button className="btn-accent" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起" : "+ 新增面经"}
        </button>
      </div>

      {showForm && (
        <div className="surface-quiet p-4 space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="环节">
              <input
                className="input"
                placeholder="OA / 一面 / 终面…"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
            </Field>
            <Field label="来源 / 贡献者">
              <input
                className="input"
                placeholder="自己 / 朋友 / LinkedIn…"
                value={contributor}
                onChange={(e) => setContributor(e.target.value)}
              />
            </Field>
          </div>
          <Field label="面经正文">
            <textarea
              className="textarea min-h-[200px]"
              value={content}
              placeholder={"逐题写：\n1. 自我介绍 ……\n2. 项目深挖 ……\n3. 反向提问 ……"}
              onChange={(e) => setContent(e.target.value)}
            />
          </Field>
          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={busy || !content} onClick={create}>
              {busy ? "解析中…" : "保存并提取高频题"}
            </button>
            {err && <span className="text-sm text-clay-600">{err}</span>}
          </div>
        </div>
      )}

      {experiences.length === 0 ? (
        <p className="text-ink-300 text-sm">该公司还没有面经。粘一份进来。</p>
      ) : (
        <ul className="space-y-3">
          {experiences.map((e) => (
            <li
              key={e.id}
              className={clsx(
                "border border-ink-100 rounded-xl p-4",
                e.applicationId === appId ? "bg-clay-50/40 border-clay-200" : "bg-ivory-100/40",
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-serif text-base text-ink-800">{e.stage ?? "面经"}</span>
                    {e.applicationId === appId ? (
                      <span className="pill text-[10px] border-clay-200 text-clay-700 bg-clay-50">绑定当前投递</span>
                    ) : (
                      <span className="pill text-[10px] border-ink-100 text-ink-400">同公司</span>
                    )}
                  </div>
                  {(e.role || e.contributor) && (
                    <div className="text-xs text-ink-400 mt-0.5">
                      {[e.role, e.contributor].filter(Boolean).join(" · ")}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 text-xs">
                  {e.applicationId === appId ? (
                    <button className="btn-quiet" onClick={() => unbind(e.id)}>解除绑定</button>
                  ) : (
                    <button className="btn-quiet" onClick={() => bind(e.id)}>绑定到当前</button>
                  )}
                  <button className="btn-quiet text-clay-600" onClick={() => del(e.id)}>删除</button>
                </div>
              </div>

              {e.highlights && e.highlights.length > 0 && (
                <ul className="mt-3 list-disc pl-5 text-sm text-ink-600 space-y-1">
                  {e.highlights.map((h, i) => (
                    <li key={i}>{h}</li>
                  ))}
                </ul>
              )}

              <details className="mt-3 text-sm text-ink-500">
                <summary className="cursor-pointer text-ink-400 hover:text-ink-700 text-xs">原文</summary>
                <pre className="mt-2 whitespace-pre-wrap text-[12px] max-h-[260px] overflow-auto">{e.content}</pre>
              </details>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="field-label mb-1">{label}</div>
      {children}
    </label>
  );
}
function Row({ k, v, highlight }: { k: string; v?: string | null; highlight?: boolean }) {
  return (
    <div>
      <div className="field-label mb-0.5">{k}</div>
      <div className={clsx("text-ink-700", highlight && "text-clay-600 font-medium")}>{v || "—"}</div>
    </div>
  );
}

function InterviewSection({ appId, interviews }: { appId: string; interviews: Interview[] }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  const [busy, startTx] = useTransition();
  const [draft, setDraft] = useState<Partial<Interview>>({
    round: interviews.length + 1,
    kind: "technical",
    outcome: "pending",
  });

  function create() {
    startTx(async () => {
      await fetch("/api/interviews", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...draft, applicationId: appId }),
      });
      setShowForm(false);
      setDraft({ round: interviews.length + 2, kind: "technical", outcome: "pending" });
      router.refresh();
    });
  }

  return (
    <section className="surface p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="display-2">面试 / 笔试</h2>
        <button className="btn-ghost" onClick={() => setShowForm((v) => !v)}>
          {showForm ? "收起" : "新增一轮"}
        </button>
      </div>

      {showForm && (
        <div className="surface-quiet p-4 mb-5 grid sm:grid-cols-2 gap-3">
          <Field label="轮次">
            <input
              type="number"
              className="input"
              value={draft.round ?? 1}
              onChange={(e) => setDraft((d) => ({ ...d, round: Number(e.target.value) }))}
            />
          </Field>
          <Field label="类型">
            <select
              className="input"
              value={draft.kind}
              onChange={(e) => setDraft((d) => ({ ...d, kind: e.target.value as Interview["kind"] }))}
            >
              {INTERVIEW_KINDS.map((k) => (
                <option key={k.value} value={k.value}>
                  {k.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="时间">
            <input
              type="datetime-local"
              className="input"
              onChange={(e) =>
                setDraft((d) => ({ ...d, scheduledAt: e.target.value ? new Date(e.target.value).toISOString() : null }))
              }
            />
          </Field>
          <Field label="结果">
            <select
              className="input"
              value={draft.outcome}
              onChange={(e) => setDraft((d) => ({ ...d, outcome: e.target.value as Interview["outcome"] }))}
            >
              {OUTCOMES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </Field>
          <div className="sm:col-span-2">
            <Field label="题目 / 笔试内容（Markdown）">
              <textarea
                className="textarea"
                placeholder={"# 第一题\n- 描述：……\n- 我的思路：……"}
                onChange={(e) => setDraft((d) => ({ ...d, questions: e.target.value }))}
              />
            </Field>
          </div>
          <div className="sm:col-span-2 flex gap-2">
            <button className="btn-primary" disabled={busy} onClick={create}>
              保存
            </button>
            <button className="btn-quiet" onClick={() => setShowForm(false)}>
              取消
            </button>
          </div>
        </div>
      )}

      {interviews.length === 0 ? (
        <p className="text-ink-300 text-sm">还没有任何面试记录。</p>
      ) : (
        <ol className="space-y-4">
          {interviews.map((it) => (
            <InterviewItem key={it.id} interview={it} />
          ))}
        </ol>
      )}
    </section>
  );
}

function InterviewItem({ interview }: { interview: Interview }) {
  const router = useRouter();
  const [busy, startTx] = useTransition();
  const [open, setOpen] = useState(false);
  const [d, setD] = useState<Partial<Interview>>({});

  function save() {
    startTx(async () => {
      await fetch(`/api/interviews/${interview.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d),
      });
      setOpen(false);
      setD({});
      router.refresh();
    });
  }
  function del() {
    if (!confirm(`删除第 ${interview.round} 轮？`)) return;
    startTx(async () => {
      await fetch(`/api/interviews/${interview.id}`, { method: "DELETE" });
      router.refresh();
    });
  }

  return (
    <li className="border border-ink-100 rounded-xl p-4 bg-ivory-100/30">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="font-serif text-xl text-ink-800">R{interview.round}</span>
          <div>
            <div className="text-ink-700 font-medium">
              {INTERVIEW_KINDS.find((x) => x.value === interview.kind)?.label}
            </div>
            <div className="text-xs text-ink-400 mt-0.5">
              {interview.scheduledAt
                ? new Date(interview.scheduledAt).toLocaleString()
                : "未排期"}
              {interview.interviewer ? ` · ${interview.interviewer}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "pill border",
              interview.outcome === "passed" && "bg-emerald-50 text-emerald-700 border-emerald-200",
              interview.outcome === "failed" && "bg-ink-50 text-ink-400 border-ink-100",
              interview.outcome === "pending" && "bg-clay-50 text-clay-600 border-clay-100",
              interview.outcome === "cancelled" && "bg-ink-50 text-ink-300 border-ink-100",
            )}
          >
            {OUTCOMES.find((o) => o.value === interview.outcome)?.label}
          </span>
          <button className="btn-quiet" onClick={() => setOpen((v) => !v)}>
            {open ? "收起" : "展开"}
          </button>
        </div>
      </div>

      {open && (
        <div className="mt-4 space-y-3">
          <Field label="题目 / 笔试内容">
            <textarea
              className="textarea"
              defaultValue={interview.questions ?? ""}
              onChange={(e) => setD((x) => ({ ...x, questions: e.target.value }))}
            />
          </Field>
          <Field label="我的答题 / 思路">
            <textarea
              className="textarea"
              defaultValue={interview.selfNotes ?? ""}
              onChange={(e) => setD((x) => ({ ...x, selfNotes: e.target.value }))}
            />
          </Field>
          <Field label="复盘">
            <textarea
              className="textarea"
              defaultValue={interview.reflection ?? ""}
              onChange={(e) => setD((x) => ({ ...x, reflection: e.target.value }))}
            />
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Field label="面试官">
              <input
                className="input"
                defaultValue={interview.interviewer ?? ""}
                onChange={(e) => setD((x) => ({ ...x, interviewer: e.target.value }))}
              />
            </Field>
            <Field label="结果">
              <select
                className="input"
                defaultValue={interview.outcome}
                onChange={(e) => setD((x) => ({ ...x, outcome: e.target.value as Interview["outcome"] }))}
              >
                {OUTCOMES.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary" onClick={save} disabled={busy}>保存</button>
            <button className="btn-ghost text-clay-600" onClick={del} disabled={busy}>删除该轮</button>
          </div>
        </div>
      )}
    </li>
  );
}
