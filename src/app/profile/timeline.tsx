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
  basic: "基本信息",
  internship: "实习",
  project: "项目",
  campus: "校内 / 学生工作",
  award: "获奖 / 证书",
  skill: "技能",
  reflection: "感悟",
};

const MODULE_COLOR: Record<ProfileModule, string> = {
  basic: "bg-ink-200 text-ink-700",
  internship: "bg-clay-100 text-clay-700",
  project: "bg-clay-50 text-clay-600",
  campus: "bg-ivory-300 text-ink-700",
  award: "bg-clay-200 text-clay-700",
  skill: "bg-ink-100 text-ink-600",
  reflection: "bg-ivory-200 text-ink-500",
};

export function ProfileTimeline({ entries }: { entries: ProfileEntry[] }) {
  const router = useRouter();
  const [modFilter, setModFilter] = useState<ProfileModule | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<ProfileEntry | null>(null);
  const [creating, setCreating] = useState(false);

  const filtered = useMemo(
    () => (modFilter ? entries.filter((e) => e.module === modFilter) : entries),
    [entries, modFilter],
  );

  // 时间格式化：present 显示"至今"，否则 yyyy-MM
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

  return (
    <div className="space-y-6">
      {/* 顶部操作栏 */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setModFilter(null)}
          className={clsx(
            "px-3 py-1.5 rounded-full text-xs border transition",
            !modFilter ? "bg-ink-700 text-ivory-50 border-ink-700" : "border-ink-100 text-ink-500 hover:border-ink-200",
          )}
        >
          全部 · {entries.length}
        </button>
        {PROFILE_MODULES.map((m) => {
          const n = entries.filter((e) => e.module === m).length;
          return (
            <button
              key={m}
              onClick={() => setModFilter(m)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs border transition",
                modFilter === m
                  ? "bg-ink-700 text-ivory-50 border-ink-700"
                  : "border-ink-100 text-ink-500 hover:border-ink-200",
              )}
            >
              {MODULE_LABEL[m]} · {n}
            </button>
          );
        })}
        <div className="ml-auto flex gap-2">
          <button className="btn-ghost" onClick={() => setCreating(true)}>+ 手动添加</button>
          <button className="btn-accent" onClick={() => setImportOpen(true)}>
            上传 CV (PDF / Word)
          </button>
        </div>
      </div>

      {/* 时间轴 */}
      {filtered.length === 0 ? (
        <div className="surface-quiet p-10 text-center">
          <div className="display-2 text-ink-500">还没有任何条目</div>
          <p className="mt-3 text-ink-400 text-sm">
            点 “上传 CV” 让 AI 自动拆分到对应模块，或手动添加一条。
          </p>
        </div>
      ) : (
        <ol className="relative pl-6 border-l border-ink-100 space-y-6">
          {filtered.map((e) => (
            <li key={e.id} className="relative">
              <span className="absolute -left-[27px] top-2 h-2.5 w-2.5 rounded-full bg-clay-400 ring-4 ring-ivory-100" />
              <article
                className={clsx(
                  "surface p-5",
                  e.status === "draft" && "border-clay-200 bg-clay-50/40",
                )}
              >
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span
                        className={clsx(
                          "pill text-[10px] border-transparent",
                          MODULE_COLOR[e.module],
                        )}
                      >
                        {MODULE_LABEL[e.module]}
                      </span>
                      {e.status === "draft" && (
                        <span className="pill text-[10px] border-clay-200 bg-clay-50 text-clay-600">
                          AI 草稿 · 待确认
                        </span>
                      )}
                      <span className="text-[11px] text-ink-400">
                        {fmt(e.startDate)} ~ {fmt(e.endDate)}
                      </span>
                    </div>
                    <h3 className="font-serif text-lg text-ink-800">{e.title}</h3>
                    {(e.org || e.role) && (
                      <div className="text-sm text-ink-500 mt-0.5">
                        {[e.org, e.role].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button className="btn-quiet" onClick={() => setEditing(e)}>编辑</button>
                    {e.status === "draft" && (
                      <button
                        className="btn-ghost"
                        onClick={async () => {
                          await fetch(`/api/profile-entries/${e.id}`, {
                            method: "PATCH",
                            headers: { "content-type": "application/json" },
                            body: JSON.stringify({ status: "active" }),
                          });
                          router.refresh();
                        }}
                      >
                        采纳
                      </button>
                    )}
                    <button className="btn-quiet text-clay-600" onClick={() => remove(e.id)}>删除</button>
                  </div>
                </header>

                {e.summary && <p className="mt-3 text-sm text-ink-600">{e.summary}</p>}
                {e.bullets && e.bullets.length > 0 && (
                  <ul className="mt-3 space-y-1.5 text-sm text-ink-600">
                    {e.bullets.map((b, i) => (
                      <li key={i} className="pl-3 relative">
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
            </li>
          ))}
        </ol>
      )}

      {importOpen && (
        <CvImportDialog
          onClose={() => setImportOpen(false)}
          onApplied={() => {
            setImportOpen(false);
            router.refresh();
          }}
        />
      )}
      {creating && (
        <EntryEditor
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
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
  // 用户选择：默认 add，重复时默认 review
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
      if (!isDocx && !isPdf) {
        throw new Error("只支持 .pdf 或 .docx");
      }
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
          // 合并：把新 bullets / tags 追加到现有条目
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
        <header className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <div>
            <div className="label-eyebrow">IMPORT CV</div>
            <h2 className="font-serif text-xl text-ink-800 mt-1">从 PDF / Word 导入</h2>
          </div>
          <button className="btn-quiet" onClick={onClose}>关闭</button>
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
                选择文件…
              </label>
              <p className="text-xs text-ink-400 mt-3">
                支持 .pdf / .docx。AI 会自动拆分到 实习 / 项目 / 校内 / 获奖 / 技能 等模块。
              </p>
              {busy && <p className="text-sm text-clay-500 mt-3">解析中… {filename}</p>}
              {err && <p className="text-sm text-clay-600 mt-3">{err}</p>}
            </div>
          )}

          {rows && (
            <div>
              <div className="text-xs text-ink-400 mb-4">
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
          <footer className="px-6 py-4 border-t border-ink-100 flex items-center justify-between bg-ivory-100/60">
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
    <li className="border border-ink-100 rounded-xl p-4 bg-ivory-50">
      <div className="flex items-center justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <span className="pill text-[10px] border-ink-100 text-ink-500">{MODULE_LABEL[entry.module]}</span>
          {suggestion.kind === "new" && (
            <span className="pill text-[10px] border-clay-100 text-clay-600 bg-clay-50">新发现</span>
          )}
          {suggestion.kind === "possible_duplicate" && (
            <span className="pill text-[10px] border-ink-100 text-ink-500">疑似重复 {(suggestion.similarity * 100).toFixed(0)}%</span>
          )}
          {suggestion.kind === "replace_or_merge" && (
            <span className="pill text-[10px] border-clay-200 text-clay-700 bg-clay-100">已存在条目 · 需要决策</span>
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

      <div className="text-sm">
        <div className="font-medium text-ink-800">{entry.title}</div>
        {(entry.org || entry.role) && (
          <div className="text-ink-500 text-xs mt-0.5">
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
            <li key={i} className="pl-3 relative">
              <span className="absolute left-0 top-1.5 h-1 w-1 rounded-full bg-ink-300" />
              {b}
            </li>
          ))}
        </ul>
      )}

      {hasMatch && (
        <div className="mt-3 text-xs text-ink-400 border-t border-ink-100 pt-2">
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

// —— 手动新增/编辑 ——

function EntryEditor({
  entry,
  onClose,
  onSaved,
}: {
  entry?: ProfileEntry;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState<Partial<ProfileEntry>>(
    entry ?? {
      module: "internship",
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
        <header className="px-6 py-4 border-b border-ink-100 flex items-center justify-between">
          <h2 className="font-serif text-xl text-ink-800">{entry ? "编辑条目" : "新增条目"}</h2>
          <button className="btn-quiet" onClick={onClose}>关闭</button>
        </header>
        <div className="px-6 py-5 grid sm:grid-cols-2 gap-3">
          <Lbl label="模块">
            <select
              className="input"
              value={draft.module ?? "internship"}
              onChange={(e) =>
                setDraft({ ...draft, module: e.target.value as ProfileModule })
              }
            >
              {PROFILE_MODULES.map((m) => (
                <option key={m} value={m}>
                  {MODULE_LABEL[m]}
                </option>
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
          <Lbl label="单位 / 组织">
            <input
              className="input"
              value={draft.org ?? ""}
              onChange={(e) => setDraft({ ...draft, org: e.target.value })}
            />
          </Lbl>
          <Lbl label="角色 / 职位">
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
            <Lbl label="bullets（每行一条）">
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
    <label className="block">
      <div className="field-label mb-1">{label}</div>
      {children}
    </label>
  );
}
