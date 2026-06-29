"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  PROFILE_MODULES,
  type ProfileEntry,
  type ProfileModule,
} from "@/lib/types";

const MODULE_LABEL: Record<ProfileModule, string> = {
  basic: "个人简介",
  skill: "核心技能",
  education: "教育经历",
  internship: "实习 / 工作",
  project: "项目经历",
  campus: "校园 / 课外活动",
  award: "获奖 / 证书",
  reflection: "其他经历",
};

const MODULE_HINT: Record<ProfileModule, string> = {
  basic: "姓名、联系方式、一句话简介",
  skill: "技术栈、语言、工具、兴趣",
  education: "学校、学位、GPA、主修课程",
  internship: "公司 · 岗位 · 时间 · 关键成果",
  project: "项目名 · 角色 · 技术栈 · 量化结果",
  campus: "社团、学生工作、志愿活动",
  award: "竞赛、奖学金、证书",
  reflection: "学习笔记、思考、其他可援引的经历",
};

const MODULE_ICON: Record<ProfileModule, string> = {
  basic: "◐",
  skill: "✦",
  education: "▤",
  internship: "▣",
  project: "▰",
  campus: "◇",
  award: "★",
  reflection: "✎",
};

export function ProfileTimeline({ entries }: { entries: ProfileEntry[] }) {
  const router = useRouter();
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileEntry | null>(null);
  const [creatingModule, setCreatingModule] = useState<ProfileModule | null>(null);

  const byModule = useMemo(() => {
    const m = new Map<ProfileModule, ProfileEntry[]>();
    for (const mod of PROFILE_MODULES) m.set(mod, []);
    for (const e of entries) m.get(e.module)?.push(e);
    // 时间倒序：present > yyyy-MM desc
    for (const arr of m.values()) {
      arr.sort((a, b) => {
        const ak = (a.endDate === "present" ? "9999-99" : a.endDate ?? a.startDate ?? "") + a.updatedAt;
        const bk = (b.endDate === "present" ? "9999-99" : b.endDate ?? b.startDate ?? "") + b.updatedAt;
        return ak < bk ? 1 : ak > bk ? -1 : 0;
      });
    }
    return m;
  }, [entries]);

  function fmt(d?: string | null) {
    if (!d) return "—";
    if (d === "present") return "至今";
    return d.slice(0, 7);
  }

  async function remove(id: string) {
    if (!confirm("删除该条目？此操作不可撤销。")) return;
    await fetch(`/api/profile-entries/${id}`, { method: "DELETE" });
    router.refresh();
  }

  async function adopt(id: string) {
    await fetch(`/api/profile-entries/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    router.refresh();
  }

  // 顶部 hero：basic + skill
  const basics = byModule.get("basic") ?? [];
  const skills = byModule.get("skill") ?? [];
  const profileName = basics[0]?.org ?? basics[0]?.title ?? null;

  const totalDraft = entries.filter((e) => e.status === "draft").length;

  return (
    <div className="space-y-8">
      {/* 顶部操作栏 */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-sm text-ink-400">
          共 {entries.length} 条
          {totalDraft > 0 && (
            <span className="ml-2 text-clay-600">· {totalDraft} 条 AI 草稿待确认</span>
          )}
        </div>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => setCreatingModule("internship")}>
            + 添加经历
          </button>
          <button className="btn-accent" onClick={() => setImportOpen(true)}>
            上传 CV
          </button>
        </div>
      </div>

      {/* —— Hero: 基本信息 + 技能 —— */}
      <ProfileHero
        basics={basics}
        skills={skills}
        name={profileName}
        onEdit={setEditing}
        onAdd={() => setCreatingModule("basic")}
        onAddSkill={() => setCreatingModule("skill")}
        onRemove={remove}
        onAdopt={adopt}
      />

      {/* —— 各章节 —— */}
      {PROFILE_MODULES.filter((m) => m !== "basic" && m !== "skill").map((mod) => {
        const items = byModule.get(mod) ?? [];
        return (
          <Section
            key={mod}
            module={mod}
            items={items}
            fmt={fmt}
            onAdd={() => setCreatingModule(mod)}
            onEdit={setEditing}
            onRemove={remove}
            onAdopt={adopt}
          />
        );
      })}

      {/* —— Dialogs —— */}
      {importOpen && (
        <CvImportDialog
          onClose={() => setImportOpen(false)}
          onApplied={() => {
            setImportOpen(false);
            router.refresh();
          }}
        />
      )}
      {creatingModule && (
        <EntryEditor
          initialModule={creatingModule}
          onClose={() => setCreatingModule(null)}
          onSaved={() => {
            setCreatingModule(null);
            router.refresh();
          }}
        />
      )}
      {editing && (
        <EntryEditor
          entry={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

// —— Hero 区：基本信息 + 技能 ——

function ProfileHero({
  basics,
  skills,
  name,
  onEdit,
  onAdd,
  onAddSkill,
  onRemove,
  onAdopt,
}: {
  basics: ProfileEntry[];
  skills: ProfileEntry[];
  name: string | null;
  onEdit: (e: ProfileEntry) => void;
  onAdd: () => void;
  onAddSkill: () => void;
  onRemove: (id: string) => void;
  onAdopt: (id: string) => void;
}) {
  const allSkills = Array.from(
    new Set(skills.flatMap((s) => s.tags ?? []).filter(Boolean)),
  );

  return (
    <section className="surface p-6 sm:p-8">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <div className="label-eyebrow">{MODULE_LABEL.basic}</div>
          <h2 className="font-serif text-2xl text-ink-800 mt-2 break-words">
            {name ?? "尚未填写姓名"}
          </h2>
          {basics[0]?.summary && (
            <p className="mt-2 text-ink-600 break-words leading-relaxed max-w-2xl">
              {basics[0].summary}
            </p>
          )}
          {basics[0]?.bullets && basics[0].bullets.length > 0 && (
            <ul className="mt-3 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm text-ink-500">
              {basics[0].bullets.map((b, i) => (
                <li key={i} className="break-words">{b}</li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-1.5 shrink-0">
          {basics[0] ? (
            <button className="btn-quiet text-xs" onClick={() => onEdit(basics[0])}>编辑</button>
          ) : (
            <button className="btn-quiet text-xs" onClick={onAdd}>+ 填写</button>
          )}
        </div>
      </div>

      {/* 技能行 */}
      <div className="mt-6 pt-5 border-t border-ink-100">
        <div className="flex items-center justify-between mb-3">
          <div className="label-eyebrow">{MODULE_LABEL.skill}</div>
          <button className="btn-quiet text-xs" onClick={onAddSkill}>+ 添加</button>
        </div>
        {allSkills.length === 0 ? (
          <p className="text-ink-300 text-sm">未填写。</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {allSkills.map((s) => (
              <span key={s} className="pill border-ink-100 text-ink-500 bg-ivory-100">
                {s}
              </span>
            ))}
          </div>
        )}
        {/* 多张 skill entry 卡（很少见，但允许） */}
        {skills.length > 1 && (
          <div className="mt-4 grid sm:grid-cols-2 gap-3">
            {skills.map((s) => (
              <div key={s.id} className="border border-ink-100 rounded-2xl p-3 bg-ivory-100/40">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-sm font-medium text-ink-700 break-words min-w-0">{s.title}</span>
                  <div className="flex gap-1 shrink-0">
                    <button className="btn-quiet text-xs" onClick={() => onEdit(s)}>编辑</button>
                    <button className="btn-quiet text-xs text-clay-600" onClick={() => onRemove(s.id)}>删除</button>
                  </div>
                </div>
                {s.status === "draft" && (
                  <button className="btn-quiet text-[11px] text-clay-600" onClick={() => onAdopt(s.id)}>
                    采纳草稿
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

// —— 通用章节 ——

function Section({
  module: mod,
  items,
  fmt,
  onAdd,
  onEdit,
  onRemove,
  onAdopt,
}: {
  module: ProfileModule;
  items: ProfileEntry[];
  fmt: (d?: string | null) => string;
  onAdd: () => void;
  onEdit: (e: ProfileEntry) => void;
  onRemove: (id: string) => void;
  onAdopt: (id: string) => void;
}) {
  return (
    <section>
      <header className="flex items-baseline justify-between gap-4 mb-3 px-1">
        <div className="flex items-baseline gap-3">
          <span className="text-clay-500 text-lg leading-none">{MODULE_ICON[mod]}</span>
          <h3 className="font-serif text-xl text-ink-800">{MODULE_LABEL[mod]}</h3>
          <span className="text-xs text-ink-300">{items.length}</span>
        </div>
        <button className="btn-quiet text-xs" onClick={onAdd}>+ 添加</button>
      </header>

      {items.length === 0 ? (
        <div className="surface-quiet p-5 text-center">
          <p className="text-ink-300 text-sm">{MODULE_HINT[mod]}</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {items.map((e) => (
            <li key={e.id}>
              <EntryCard
                entry={e}
                fmt={fmt}
                onEdit={() => onEdit(e)}
                onRemove={() => onRemove(e.id)}
                onAdopt={() => onAdopt(e.id)}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function EntryCard({
  entry: e,
  fmt,
  onEdit,
  onRemove,
  onAdopt,
}: {
  entry: ProfileEntry;
  fmt: (d?: string | null) => string;
  onEdit: () => void;
  onRemove: () => void;
  onAdopt: () => void;
}) {
  return (
    <article
      className={clsx(
        "surface p-5 transition",
        e.status === "draft" && "border-clay-200 bg-clay-50/40",
      )}
    >
      <header className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <h4 className="font-medium text-ink-800 text-base break-words">{e.title}</h4>
          {(e.org || e.role) && (
            <div className="text-sm text-ink-500 mt-0.5 break-words">
              {[e.org, e.role].filter(Boolean).join(" · ")}
            </div>
          )}
          <div className="flex items-center gap-2 text-xs text-ink-400 mt-1 flex-wrap">
            <span>{fmt(e.startDate)} ~ {fmt(e.endDate)}</span>
            {e.location && <span>· {e.location}</span>}
            {e.status === "draft" && (
              <span className="pill text-[10px] border-clay-200 bg-clay-50 text-clay-600">
                AI 草稿
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {e.status === "draft" && (
            <button className="btn-quiet text-xs" onClick={onAdopt}>采纳</button>
          )}
          <button className="btn-quiet text-xs" onClick={onEdit}>编辑</button>
          <button className="btn-quiet text-xs text-clay-600" onClick={onRemove}>删除</button>
        </div>
      </header>

      {e.summary && (
        <p className="mt-3 text-sm text-ink-600 break-words leading-relaxed">{e.summary}</p>
      )}
      {e.bullets && e.bullets.length > 0 && (
        <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
          {e.bullets.map((b, i) => (
            <li key={i} className="pl-3 relative break-words">
              <span className="absolute left-0 top-2 h-1 w-1 rounded-full bg-ink-300" />
              {b}
            </li>
          ))}
        </ul>
      )}
      {e.tags && e.tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {e.tags.map((t) => (
            <span key={t} className="pill text-[10px] border-ink-100 text-ink-500 bg-ivory-100">
              {t}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}

// —— CV 导入对话框：解析 + 合并决策 ——

type SuggestionKind = "new" | "possible_duplicate" | "replace_or_merge";

interface ParsedRow {
  entry: Omit<ProfileEntry, "id" | "createdAt" | "updatedAt">;
  suggestion: {
    kind: SuggestionKind;
    matchId?: string;
    matchTitle?: string;
    matchOrg?: string | null;
    similarity: number;
  };
  decision: "add" | "merge" | "replace" | "skip";
}

function CvImportDialog({
  onClose,
  onApplied,
}: {
  onClose: () => void;
  onApplied: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[] | null>(null);
  const [provider, setProvider] = useState<string | null>(null);

  async function onFile(f: File | null) {
    if (!f) return;
    setBusy(true);
    setErr(null);
    setFilename(f.name);
    try {
      const isDocx = /\.docx$/i.test(f.name);
      const isPdf = /\.pdf$/i.test(f.name);
      if (!isDocx && !isPdf) throw new Error("只支持 .pdf 或 .docx");
      const b64 = await readBase64(f);
      const r = await fetch("/api/profile-entries/import-cv", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          pdfBase64: isPdf ? b64 : undefined,
          docxBase64: isDocx ? b64 : undefined,
          filename: f.name,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setProvider(j.data.providerUsed);
      const out: ParsedRow[] = (j.data.entries as Array<Omit<ParsedRow, "decision">>).map((row) => ({
        ...row,
        decision:
          row.suggestion.kind === "new"
            ? "add"
            : row.suggestion.kind === "replace_or_merge"
            ? "merge"
            : "add",
      }));
      setRows(out);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function commit() {
    if (!rows) return;
    setBusy(true);
    try {
      for (const row of rows) {
        if (row.decision === "skip") continue;
        if (row.decision === "add") {
          await fetch("/api/profile-entries", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...row.entry, status: "active" }),
          });
        } else if (row.decision === "replace" && row.suggestion.matchId) {
          await fetch(`/api/profile-entries/${row.suggestion.matchId}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ...row.entry, status: "active" }),
          });
        } else if (row.decision === "merge" && row.suggestion.matchId) {
          const existing = await fetch(`/api/profile-entries/${row.suggestion.matchId}`).then((r) => r.json());
          if (existing.ok) {
            const e: ProfileEntry = existing.data;
            const newBullets = Array.from(new Set([...(e.bullets ?? []), ...(row.entry.bullets ?? [])]));
            const newTags = Array.from(new Set([...(e.tags ?? []), ...(row.entry.tags ?? [])]));
            await fetch(`/api/profile-entries/${row.suggestion.matchId}`, {
              method: "PATCH",
              headers: { "content-type": "application/json" },
              body: JSON.stringify({
                bullets: newBullets,
                tags: newTags,
                summary: e.summary ?? row.entry.summary,
                status: "active",
              }),
            });
          }
        }
      }
      onApplied();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-ink-700/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="surface w-full max-w-4xl max-h-[88vh] overflow-hidden flex flex-col bg-ivory-50">
        <header className="px-6 py-4 border-b border-ink-100 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="label-eyebrow">导入 CV</div>
            <h2 className="font-serif text-xl text-ink-800 mt-1 break-words">从 PDF / Word 导入</h2>
          </div>
          <button className="btn-quiet shrink-0" onClick={onClose}>关闭</button>
        </header>

        <div className="px-6 py-5 flex-1 overflow-y-auto">
          {!rows && (
            <div className="border border-dashed border-ink-200 rounded-2xl p-8 text-center">
              <input
                id="cvpick"
                type="file"
                accept=".pdf,.docx"
                className="hidden"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)}
              />
              <label htmlFor="cvpick" className="btn-accent cursor-pointer">
                选择文件
              </label>
              <p className="text-xs text-ink-400 mt-3">
                支持 .pdf / .docx。AI 会自动拆分到 教育 / 实习 / 项目 / 校园 / 获奖 / 技能 等模块。
              </p>
              {busy && <p className="text-sm text-clay-500 mt-3">解析中… {filename}</p>}
              {err && <p className="text-sm text-clay-600 mt-3 break-words">{err}</p>}
            </div>
          )}

          {rows && (
            <div>
              <div className="text-xs text-ink-400 mb-4 break-words">
                文件：{filename} · provider: {provider} · 共解析出 {rows.length} 条
              </div>
              <ul className="space-y-3">
                {rows.map((row, i) => (
                  <RowEditor
                    key={i}
                    row={row}
                    onChange={(next) =>
                      setRows((cur) => (cur ? cur.map((r, idx) => (idx === i ? next : r)) : cur))
                    }
                  />
                ))}
              </ul>
            </div>
          )}
        </div>

        {rows && (
          <footer className="px-6 py-4 border-t border-ink-100 flex items-center justify-between bg-ivory-100/60 gap-3 flex-wrap">
            <span className="text-xs text-ink-400">
              {rows.filter((r) => r.decision !== "skip").length} 条会写入
            </span>
            <div className="flex gap-2">
              <button className="btn-ghost" onClick={onClose}>取消</button>
              <button className="btn-primary" onClick={commit} disabled={busy}>
                {busy ? "保存中…" : "确认导入"}
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
}

function RowEditor({
  row,
  onChange,
}: {
  row: ParsedRow;
  onChange: (next: ParsedRow) => void;
}) {
  const { entry, suggestion } = row;
  const hasMatch = suggestion.kind !== "new";
  return (
    <li className="border border-ink-100 rounded-2xl p-4 bg-ivory-50">
      <div className="flex items-center justify-between gap-3 mb-2 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="pill text-[10px] border-ink-100 text-ink-500">{MODULE_LABEL[entry.module]}</span>
          {suggestion.kind === "new" && (
            <span className="pill text-[10px] border-clay-100 text-clay-600 bg-clay-50">新发现</span>
          )}
          {suggestion.kind === "possible_duplicate" && (
            <span className="pill text-[10px] border-ink-100 text-ink-500">
              疑似重复 {(suggestion.similarity * 100).toFixed(0)}%
            </span>
          )}
          {suggestion.kind === "replace_or_merge" && (
            <span className="pill text-[10px] border-clay-200 text-clay-700 bg-clay-100">
              已存在条目 · 需要决策
            </span>
          )}
        </div>
        <select
          className="text-xs border border-ink-100 rounded-md px-2 py-1 bg-ivory-50"
          value={row.decision}
          onChange={(e) =>
            onChange({ ...row, decision: e.target.value as ParsedRow["decision"] })
          }
        >
          <option value="add">新增（保留两者）</option>
          {hasMatch && <option value="merge">合并到已有条目</option>}
          {hasMatch && <option value="replace">替换已有条目</option>}
          <option value="skip">丢弃</option>
        </select>
      </div>

      <div className="text-sm min-w-0">
        <div className="font-medium text-ink-800 break-words">{entry.title}</div>
        {(entry.org || entry.role) && (
          <div className="text-ink-500 text-xs mt-0.5 break-words">
            {[entry.org, entry.role].filter(Boolean).join(" · ")}
          </div>
        )}
        {(entry.startDate || entry.endDate) && (
          <div className="text-ink-400 text-xs mt-0.5">
            {entry.startDate ?? "?"} ~ {entry.endDate ?? "?"}
          </div>
        )}
      </div>

      {entry.bullets && entry.bullets.length > 0 && (
        <ul className="mt-2 space-y-1 text-xs text-ink-600">
          {entry.bullets.slice(0, 5).map((b, i) => (
            <li key={i} className="pl-3 relative break-words">
              <span className="absolute left-0 top-1.5 h-1 w-1 rounded-full bg-ink-300" />
              {b}
            </li>
          ))}
        </ul>
      )}

      {hasMatch && (
        <div className="mt-3 text-xs text-ink-400 border-t border-ink-100 pt-2 break-words">
          ↺ 已有条目：<span className="text-ink-600">{suggestion.matchTitle}</span>
          {suggestion.matchOrg && <span className="text-ink-500"> · {suggestion.matchOrg}</span>}
        </div>
      )}
    </li>
  );
}

function readBase64(f: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res((r.result as string).split(",")[1]);
    r.onerror = rej;
    r.readAsDataURL(f);
  });
}

// —— 手动新增 / 编辑 ——

function EntryEditor({
  entry,
  initialModule,
  onClose,
  onSaved,
}: {
  entry?: ProfileEntry;
  initialModule?: ProfileModule;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ProfileEntry>>(
    entry ?? {
      module: initialModule ?? "internship",
      title: "",
      bullets: [],
      tags: [],
      source: "manual",
      status: "active",
    },
  );
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    try {
      const path = entry ? `/api/profile-entries/${entry.id}` : `/api/profile-entries`;
      await fetch(path, {
        method: entry ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(draft),
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-ink-700/30 backdrop-blur-sm flex items-center justify-center px-4">
      <div className="surface w-full max-w-2xl bg-ivory-50 max-h-[88vh] overflow-y-auto">
        <header className="px-6 py-4 border-b border-ink-100 flex items-center justify-between gap-4">
          <h2 className="font-serif text-xl text-ink-800 min-w-0 break-words">
            {entry ? "编辑条目" : `新增 · ${MODULE_LABEL[draft.module as ProfileModule]}`}
          </h2>
          <button className="btn-quiet shrink-0" onClick={onClose}>关闭</button>
        </header>
        <div className="px-6 py-5 grid sm:grid-cols-2 gap-3">
          <Lbl label="模块">
            <select
              className="input"
              value={draft.module ?? "internship"}
              onChange={(e) => setDraft({ ...draft, module: e.target.value as ProfileModule })}
            >
              {PROFILE_MODULES.map((m) => (
                <option key={m} value={m}>{MODULE_LABEL[m]}</option>
              ))}
            </select>
          </Lbl>
          <Lbl label="标题">
            <input
              className="input"
              value={draft.title ?? ""}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </Lbl>
          <Lbl label="单位 / 学校 / 组织">
            <input
              className="input"
              value={draft.org ?? ""}
              onChange={(e) => setDraft({ ...draft, org: e.target.value })}
            />
          </Lbl>
          <Lbl label="角色 / 学位">
            <input
              className="input"
              value={draft.role ?? ""}
              onChange={(e) => setDraft({ ...draft, role: e.target.value })}
            />
          </Lbl>
          <Lbl label="开始 (yyyy-MM)">
            <input
              className="input"
              placeholder="2024-09"
              value={draft.startDate ?? ""}
              onChange={(e) => setDraft({ ...draft, startDate: e.target.value })}
            />
          </Lbl>
          <Lbl label="结束 (yyyy-MM 或 present)">
            <input
              className="input"
              placeholder="2025-06 或 present"
              value={draft.endDate ?? ""}
              onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}
            />
          </Lbl>
          <div className="sm:col-span-2">
            <Lbl label="一句话总结">
              <input
                className="input"
                value={draft.summary ?? ""}
                onChange={(e) => setDraft({ ...draft, summary: e.target.value })}
              />
            </Lbl>
          </div>
          <div className="sm:col-span-2">
            <Lbl label="详情 / Bullets（每行一条）">
              <textarea
                className="textarea"
                value={(draft.bullets ?? []).join("\n")}
                onChange={(e) =>
                  setDraft({ ...draft, bullets: e.target.value.split("\n").filter(Boolean) })
                }
              />
            </Lbl>
          </div>
          <div className="sm:col-span-2">
            <Lbl label="标签（逗号分隔）">
              <input
                className="input"
                value={(draft.tags ?? []).join(", ")}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                  })
                }
              />
            </Lbl>
          </div>
        </div>
        <footer className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-2 bg-ivory-100/60">
          <button className="btn-ghost" onClick={onClose}>取消</button>
          <button className="btn-primary" onClick={save} disabled={busy || !draft.title}>
            {busy ? "保存中…" : "保存"}
          </button>
        </footer>
      </div>
    </div>
  );
}

function Lbl({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block min-w-0">
      <div className="field-label mb-1">{label}</div>
      {children}
    </label>
  );
}
