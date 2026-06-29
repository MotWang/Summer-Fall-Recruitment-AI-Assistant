"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import {
  APPLICATION_SEASONS,
  APPLICATION_STATUSES,
  SEASON_LABEL,
  type Application,
  type ApplicationStatus,
  type Season,
} from "@/lib/types";
import { APPLICATION_INDUSTRIES, normalizeIndustry } from "@/lib/industries";
import { IndustrySelect } from "@/components/industry-select";
import { STATUS_LABEL, StatusPill } from "@/components/ui";

type SortKey =
  | "company"
  | "role"
  | "industry"
  | "location"
  | "deadline"
  | "appliedAt"
  | "updatedAt"
  | "status"
  | "season";
type SortDir = "asc" | "desc" | null;

export function ApplicationsView({
  initialApps,
  initialStatus,
  initialSearch,
}: {
  initialApps: Application[];
  initialStatus: ApplicationStatus | null;
  initialSearch: string;
}) {
  const router = useRouter();
  const [apps, setApps] = useState(initialApps);
  const [search, setSearch] = useState(initialSearch);
  const [statusFilter, setStatusFilter] = useState<ApplicationStatus | null>(initialStatus);
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [companyFilter, setCompanyFilter] = useState<string>("");
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [seasonFilter, setSeasonFilter] = useState<string>("");
  const [sortKey, setSortKey] = useState<SortKey>("updatedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [highlightId, setHighlightId] = useState<string | null>(null);

  // initialApps 在父级 server component refresh 后会变；同步过来
  useEffect(() => {
    setApps(initialApps);
  }, [initialApps]);

  const companyOptions = useMemo(
    () => Array.from(new Set(apps.map((a) => a.company).filter(Boolean))).sort(),
    [apps],
  );
  const roleOptions = useMemo(
    () => Array.from(new Set(apps.map((a) => a.role).filter(Boolean))).sort(),
    [apps],
  );

  const filtered = useMemo(() => {
    let r = apps;
    if (statusFilter) r = r.filter((a) => a.status === statusFilter);
    if (industryFilter) {
      r = r.filter((a) => normalizeIndustry(a.industry) === industryFilter);
    }
    if (companyFilter) r = r.filter((a) => a.company === companyFilter);
    if (roleFilter) r = r.filter((a) => a.role === roleFilter);
    if (seasonFilter) r = r.filter((a) => (a.season || "") === seasonFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      r = r.filter(
        (a) =>
          a.company.toLowerCase().includes(q) ||
          a.role.toLowerCase().includes(q) ||
          (a.location ?? "").toLowerCase().includes(q),
      );
    }
    if (sortDir && sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      r = [...r].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (av === bv) return 0;
        if (av === null || av === undefined || av === "") return 1;
        if (bv === null || bv === undefined || bv === "") return -1;
        return av < bv ? -1 * dir : 1 * dir;
      });
    }
    return r;
  }, [apps, search, statusFilter, industryFilter, companyFilter, roleFilter, seasonFilter, sortKey, sortDir]);

  async function deleteApp(app: Application) {
    if (!confirm(`确定删除「${app.company} · ${app.role}」？此操作不可撤销。`)) return;
    setApps((cur) => cur.filter((a) => a.id !== app.id));
    await fetch(`/api/applications/${app.id}`, { method: "DELETE" });
    router.refresh();
  }

  function nextSort(k: SortKey) {
    if (sortKey !== k) {
      setSortKey(k);
      setSortDir("asc");
      return;
    }
    if (sortDir === "asc") setSortDir("desc");
    else if (sortDir === "desc") {
      setSortKey("updatedAt");
      setSortDir("desc");
    } else setSortDir("asc");
  }

  async function patchStatus(app: Application, next: ApplicationStatus) {
    const patch: Partial<Application> = {
      status: next,
      ...(next === "applied" && !app.appliedAt ? { appliedAt: new Date().toISOString() } : {}),
    };
    setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, ...patch } : a)));
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    router.refresh();
  }

  async function patchSeason(app: Application, next: Season) {
    setApps((cur) => cur.map((a) => (a.id === app.id ? { ...a, season: next } : a)));
    await fetch(`/api/applications/${app.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ season: next }),
    });
    router.refresh();
  }

  function onNewAppCreated(a: Application) {
    setApps((cur) => [a, ...cur.filter((x) => x.id !== a.id)]);
    setHighlightId(a.id);
    setTimeout(() => setHighlightId(null), 2500);
  }

  return (
    <div className="space-y-6">
      <IngestPanel onCreated={onNewAppCreated} />

      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-[200px]"
          placeholder="搜索公司 / 岗位 / 地点…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="input max-w-[140px]"
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
        >
          <option value="">全部公司</option>
          {companyOptions.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
        >
          <option value="">全部岗位</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={industryFilter}
          onChange={(e) => setIndustryFilter(e.target.value)}
        >
          <option value="">全部行业</option>
          {APPLICATION_INDUSTRIES.map((ind) => (
            <option key={ind} value={ind}>
              {ind}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[120px]"
          value={seasonFilter}
          onChange={(e) => setSeasonFilter(e.target.value)}
        >
          <option value="">全部季节</option>
          {APPLICATION_SEASONS.map((s) => (
            <option key={s} value={s}>
              {SEASON_LABEL[s]}
            </option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={statusFilter ?? ""}
          onChange={(e) =>
            setStatusFilter((e.target.value || null) as ApplicationStatus | null)
          }
        >
          <option value="">全部状态</option>
          {APPLICATION_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
        {(statusFilter || industryFilter || companyFilter || roleFilter || seasonFilter || search) && (
          <button
            type="button"
            className="text-xs text-ink-400 hover:text-clay-500"
            onClick={() => {
              setStatusFilter(null);
              setIndustryFilter("");
              setCompanyFilter("");
              setRoleFilter("");
              setSeasonFilter("");
              setSearch("");
            }}
          >
            清除筛选
          </button>
        )}
        <span className="text-xs text-ink-400 ml-auto">
          {filtered.length} / {apps.length}
        </span>
      </div>

      <div className="surface overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ivory-200/40 border-b border-ink-100">
              <tr className="text-left text-ink-400 text-[11px] uppercase tracking-[0.14em]">
                <Th label="公司" col="company" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="岗位" col="role" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="行业" col="industry" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="季节" col="season" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="地点" col="location" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="截止" col="deadline" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="投递日" col="appliedAt" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <Th label="状态" col="status" sortKey={sortKey} sortDir={sortDir} onClick={nextSort} />
                <th className="px-3 py-3 w-24 text-[11px] uppercase tracking-[0.14em] text-ink-400 font-medium">
                  操作
                </th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center text-ink-300 text-sm py-12">
                    没有匹配的投递。试试粘一段 JD 到上面，一键入库。
                  </td>
                </tr>
              ) : (
                filtered.map((a) => (
                  <Row
                    key={a.id}
                    app={a}
                    highlighted={a.id === highlightId}
                    onPatchStatus={(next) => patchStatus(a, next)}
                    onPatchSeason={(next) => patchSeason(a, next)}
                    onDelete={() => deleteApp(a)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function sortValue(a: Application, k: SortKey): string | number | null {
  switch (k) {
    case "company":
      return a.company.toLowerCase();
    case "role":
      return a.role.toLowerCase();
    case "industry":
      return (a.industry ?? "").toLowerCase();
    case "location":
      return (a.location ?? "").toLowerCase();
    case "deadline":
      return a.deadline ?? "";
    case "appliedAt":
      return a.appliedAt ?? "";
    case "updatedAt":
      return a.updatedAt;
    case "status":
      return APPLICATION_STATUSES.indexOf(a.status);
    case "season":
      return a.season ?? "";
  }
}

function Th({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onClick: (k: SortKey) => void;
}) {
  const active = sortKey === col && sortDir;
  return (
    <th
      className={clsx(
        "px-3 py-3 font-medium select-none cursor-pointer whitespace-nowrap",
        active ? "text-ink-700" : "hover:text-ink-600",
      )}
      onClick={() => onClick(col)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active && <span className="text-clay-500">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

function Row({
  app,
  highlighted,
  onPatchStatus,
  onPatchSeason,
  onDelete,
}: {
  app: Application;
  highlighted: boolean;
  onPatchStatus: (next: ApplicationStatus) => void;
  onPatchSeason: (next: Season) => void;
  onDelete: () => void;
}) {
  return (
    <tr
      className={clsx(
        "border-b border-ink-100 last:border-b-0 transition",
        highlighted ? "bg-clay-50" : "hover:bg-ivory-100/60",
      )}
    >
      <td className="px-3 py-3 align-top">
        <Link
          href={`/applications/${app.id}`}
          className="font-medium text-ink-800 hover:text-clay-500 break-words"
        >
          {app.company}
        </Link>
      </td>
      <td className="px-3 py-3 text-ink-600 align-top">
        <Link href={`/applications/${app.id}`} className="hover:text-clay-500 break-words">
          {app.role}
        </Link>
      </td>
      <td className="px-3 py-3 text-ink-500 align-top whitespace-nowrap">
        {normalizeIndustry(app.industry) ?? "—"}
      </td>
      <td className="px-3 py-3 align-top">
        <SeasonMenu current={(app.season ?? "") as Season} onPick={onPatchSeason} />
      </td>
      <td className="px-3 py-3 text-ink-500 align-top">{app.location ?? "—"}</td>
      <td
        className={clsx(
          "px-3 py-3 align-top whitespace-nowrap",
          app.deadline ? "text-ink-700" : "text-ink-300",
        )}
      >
        {app.deadline ?? "—"}
      </td>
      <td className="px-3 py-3 text-ink-500 align-top whitespace-nowrap">
        {app.appliedAt?.slice(0, 10) ?? "—"}
      </td>
      <td className="px-3 py-3 align-top">
        <StatusMenu current={app.status} onPick={onPatchStatus} />
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-2">
          <Link href={`/applications/${app.id}`} className="link text-xs">
            详情
          </Link>
          <button
            type="button"
            className="text-xs text-clay-600 hover:text-clay-700"
            onClick={onDelete}
            title="删除投递"
          >
            删除
          </button>
        </div>
      </td>
    </tr>
  );
}

function StatusMenu({
  current,
  onPick,
}: {
  current: ApplicationStatus;
  onPick: (s: ApplicationStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="focus:outline-none"
        title="点击切换状态"
      >
        <StatusPill status={current} />
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 surface p-1 shadow-soft min-w-[140px]">
          {APPLICATION_STATUSES.map((s) => (
            <button
              key={s}
              onClick={() => {
                setOpen(false);
                if (s !== current) onPick(s);
              }}
              className={clsx(
                "w-full text-left text-xs px-2 py-1.5 rounded-md transition",
                s === current
                  ? "bg-clay-50 text-clay-700"
                  : "hover:bg-ivory-100 text-ink-600",
              )}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SeasonMenu({
  current,
  onPick,
}: {
  current: Season;
  onPick: (s: Season) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    if (open) {
      document.addEventListener("mousedown", onDown);
      return () => document.removeEventListener("mousedown", onDown);
    }
  }, [open]);

  const label = current ? SEASON_LABEL[current as Exclude<Season, "">] : "未标注";

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className={clsx(
          "pill border transition focus:outline-none",
          current
            ? "border-ink-100 text-ink-500 bg-ivory-100"
            : "border-dashed border-ink-200 text-ink-300 bg-transparent",
        )}
        title="点击切换季节"
      >
        {label}
      </button>
      {open && (
        <div className="absolute z-10 top-full left-0 mt-1 surface p-1 shadow-soft min-w-[120px]">
          {APPLICATION_SEASONS.map((s) => (
            <button
              key={s}
              onClick={() => {
                setOpen(false);
                if (s !== current) onPick(s);
              }}
              className={clsx(
                "w-full text-left text-xs px-2 py-1.5 rounded-md transition",
                s === current
                  ? "bg-clay-50 text-clay-700"
                  : "hover:bg-ivory-100 text-ink-600",
              )}
            >
              {SEASON_LABEL[s]}
            </button>
          ))}
          {current && (
            <>
              <div className="border-t border-ink-100 my-1" />
              <button
                onClick={() => {
                  setOpen(false);
                  onPick("");
                }}
                className="w-full text-left text-xs px-2 py-1.5 rounded-md hover:bg-ivory-100 text-ink-400"
              >
                清空 · 未标注
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// —— 顶部 Ingest 卡 ——

function IngestPanel({ onCreated }: { onCreated: (a: Application) => void }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"url" | "text" | "file">("text");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileKind, setFileKind] = useState<"pdf" | "docx" | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Application> | null>(null);
  const [, startTx] = useTransition();

  function onPick(file: File | null) {
    if (!file) return;
    const isDocx = /\.docx$/i.test(file.name);
    const isPdf = /\.pdf$/i.test(file.name);
    if (!isDocx && !isPdf) {
      setErr("只支持 .pdf 或 .docx");
      return;
    }
    setFileName(file.name);
    setFileKind(isPdf ? "pdf" : "docx");
    const r = new FileReader();
    r.onload = () => setFileBase64((r.result as string).split(",")[1]);
    r.readAsDataURL(file);
  }

  async function parse() {
    setBusy(true);
    setErr(null);
    setDraft(null);
    try {
      const r = await fetch("/api/ingest", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          url: mode === "url" ? url : undefined,
          text: mode === "text" ? text : undefined,
          pdfBase64: mode === "file" && fileKind === "pdf" ? fileBase64 : undefined,
          docxBase64: mode === "file" && fileKind === "docx" ? fileBase64 : undefined,
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setDraft(j.data.draft);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function save(d: Partial<Application>) {
    setBusy(true);
    try {
      const r = await fetch("/api/applications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(d),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      onCreated(j.data as Application);
      // 重置
      setDraft(null);
      setText("");
      setUrl("");
      setFileBase64(null);
      setFileName(null);
      setFileKind(null);
      setOpen(false);
      startTx(() => router.refresh());
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (!open) {
    return (
      <section className="surface-quiet p-4 flex items-center justify-between gap-4">
        <div>
          <div className="label-eyebrow">PARSE → SAVE</div>
          <p className="text-sm text-ink-500 mt-1">
            把链接 / JD 文本 / PDF 喂进来，AI 解析公司岗位关键词，直接入库。
          </p>
        </div>
        <button className="btn-accent" onClick={() => setOpen(true)}>
          解析新岗位
        </button>
      </section>
    );
  }

  return (
    <section className="surface p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(["text", "url", "file"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs border transition",
                mode === m
                  ? "bg-ink-700 text-ivory-50 border-ink-700"
                  : "border-ink-100 text-ink-500 hover:border-ink-200",
              )}
            >
              {m === "url" ? "链接 URL" : m === "text" ? "粘 JD 文本" : "上传 PDF / Word"}
            </button>
          ))}
        </div>
        <button className="btn-quiet" onClick={() => setOpen(false)}>收起</button>
      </div>

      {mode === "url" && (
        <input
          className="input"
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      )}
      {mode === "text" && (
        <textarea
          className="textarea min-h-[160px]"
          placeholder="把 JD 全文粘到这里 — 含岗位描述、要求、截止时间。"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      )}
      {mode === "file" && (
        <div className="border border-dashed border-ink-200 rounded-xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <span className="text-sm text-ink-400 break-words min-w-0">
            {fileName ?? "选一份 PDF 或 Word 文件…"}
          </span>
          <label className="btn-ghost cursor-pointer">
            <input
              type="file"
              accept=".pdf,.docx,application/pdf"
              className="hidden"
              onChange={(e) => onPick(e.target.files?.[0] ?? null)}
            />
            选择文件
          </label>
        </div>
      )}

      <div className="flex items-center gap-3">
        <button
          className="btn-accent"
          onClick={parse}
          disabled={
            busy ||
            (mode === "url" && !url) ||
            (mode === "text" && !text.trim()) ||
            (mode === "file" && !fileBase64)
          }
        >
          {busy ? "解析中…" : draft ? "重新解析" : "解析"}
        </button>
        {err && <span className="text-sm text-clay-600">{err}</span>}
      </div>

      {draft && <DraftInline draft={draft} setDraft={setDraft} onSave={() => save(draft)} busy={busy} />}
    </section>
  );
}

function DraftInline({
  draft,
  setDraft,
  onSave,
  busy,
}: {
  draft: Partial<Application>;
  setDraft: (d: Partial<Application>) => void;
  onSave: () => void;
  busy: boolean;
}) {
  function patch<K extends keyof Application>(k: K, v: Application[K] | null) {
    setDraft({ ...draft, [k]: v });
  }
  return (
    <div className="border-t border-ink-100 pt-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="label-eyebrow">CONFIRM</div>
        <button className="btn-primary" disabled={busy || !draft.company || !draft.role} onClick={onSave}>
          {busy ? "保存中…" : "保存到看板"}
        </button>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <Mini label="公司" v={draft.company ?? ""} on={(v) => patch("company", v)} />
        <Mini label="岗位" v={draft.role ?? ""} on={(v) => patch("role", v)} />
        <label className="block">
          <div className="field-label mb-1">行业</div>
          <IndustrySelect
            value={draft.industry ?? ""}
            onChange={(v) => patch("industry", v || null)}
            allowEmpty
          />
        </label>
        <label className="block">
          <div className="field-label mb-1">季节</div>
          <select
            className="input"
            value={draft.season ?? ""}
            onChange={(e) => patch("season", (e.target.value || "") as Season)}
          >
            <option value="">未标注（AI 推断不出）</option>
            {APPLICATION_SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_LABEL[s]}
              </option>
            ))}
          </select>
        </label>
        <Mini label="地点" v={draft.location ?? ""} on={(v) => patch("location", v)} />
        <Mini label="起始日期" v={draft.postedAt ?? ""} on={(v) => patch("postedAt", v)} type="date" />
        <Mini label="截止日期" v={draft.deadline ?? ""} on={(v) => patch("deadline", v)} type="date" />
      </div>
      <Mini
        label="关键词（逗号分隔）"
        v={(draft.keywords ?? []).join(", ")}
        on={(v) =>
          setDraft({
            ...draft,
            keywords: v.split(",").map((s) => s.trim()).filter(Boolean),
          })
        }
      />
    </div>
  );
}

function Mini({
  label,
  v,
  on,
  type,
}: {
  label: string;
  v: string;
  on: (v: string) => void;
  type?: "text" | "date";
}) {
  return (
    <label className="block">
      <div className="field-label mb-1">{label}</div>
      <input className="input" type={type ?? "text"} value={v} onChange={(e) => on(e.target.value)} />
    </label>
  );
}
