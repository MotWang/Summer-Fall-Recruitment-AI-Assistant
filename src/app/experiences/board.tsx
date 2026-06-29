"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import type { Application, SharedExperience } from "@/lib/types";

export function ExperienceBoard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialFilter = searchParams.get("company") ?? "";

  const [list, setList] = useState<SharedExperience[]>([]);
  const [apps, setApps] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [contributor, setContributor] = useState("");
  const [stage, setStage] = useState("");
  const [content, setContent] = useState("");
  const [applicationId, setApplicationId] = useState<string>("");
  const [filter, setFilter] = useState(initialFilter);

  const reload = useCallback(async () => {
    setLoadErr(null);
    try {
      const [expRes, appRes] = await Promise.all([
        fetch("/api/experiences", { cache: "no-store" }),
        fetch("/api/applications", { cache: "no-store" }),
      ]);
      const exp = await expRes.json();
      const app = await appRes.json();
      if (!exp.ok) throw new Error(exp.error ?? "加载面经失败");
      if (!app.ok) throw new Error(app.error ?? "加载投递失败");
      const nextList = exp.data as SharedExperience[];
      setList(nextList);
      setApps(app.data as Application[]);
      return nextList;
    } catch (e) {
      setLoadErr((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    if (!loading && list.length === 0) setOpen(true);
  }, [loading, list.length]);

  useEffect(() => {
    setFilter(initialFilter);
  }, [initialFilter]);

  const suggestApp = useMemo(() => {
    if (!company.trim()) return null;
    return apps.find((a) => a.company.toLowerCase() === company.trim().toLowerCase()) ?? null;
  }, [company, apps]);

  const [companySel, setCompanySel] = useState("");
  const [roleSel, setRoleSel] = useState("");
  const [stageSel, setStageSel] = useState("");

  const companyOptions = useMemo(
    () => Array.from(new Set(list.map((e) => e.company).filter(Boolean))).sort() as string[],
    [list],
  );
  const roleOptions = useMemo(
    () =>
      Array.from(new Set(list.map((e) => e.role ?? "").filter(Boolean))).sort() as string[],
    [list],
  );
  const stageOptions = useMemo(
    () =>
      Array.from(new Set(list.map((e) => e.stage ?? "").filter(Boolean))).sort() as string[],
    [list],
  );

  const visible = useMemo(() => {
    let r = list;
    if (companySel) r = r.filter((e) => e.company === companySel);
    if (roleSel) r = r.filter((e) => e.role === roleSel);
    if (stageSel) r = r.filter((e) => e.stage === stageSel);
    const q = filter.trim().toLowerCase();
    if (q) {
      r = r.filter(
        (e) =>
          e.company.toLowerCase().includes(q) ||
          (e.role ?? "").toLowerCase().includes(q) ||
          (e.stage ?? "").toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q),
      );
    }
    return r;
  }, [list, filter, companySel, roleSel, stageSel]);

  const hasAnyFilter = !!(filter || companySel || roleSel || stageSel);

  const grouped = useMemo(() => {
    const byCo = new Map<string, SharedExperience[]>();
    for (const e of visible) {
      const k = e.company?.trim() || "未识别公司";
      if (!byCo.has(k)) byCo.set(k, []);
      byCo.get(k)!.push(e);
    }
    return Array.from(byCo.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [visible]);

  async function create() {
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch("/api/experiences", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          rawContent: content,
          company: company || undefined,
          role: role || undefined,
          contributor: contributor || undefined,
          stage: stage || undefined,
          applicationId: applicationId || (suggestApp ? suggestApp.id : undefined),
        }),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setContent("");
      setCompany("");
      setRole("");
      setStage("");
      setContributor("");
      setApplicationId("");
      setOpen(false);
      await reload();
      router.refresh();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function del(id: string) {
    if (!confirm("删除这份面经？")) return;
    await fetch(`/api/experiences/${id}`, { method: "DELETE" });
    await reload();
    router.refresh();
  }

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-10 w-64 bg-ivory-200 rounded-lg" />
        <div className="h-32 bg-ivory-200 rounded-xl" />
      </div>
    );
  }

  if (loadErr) {
    return (
      <div className="surface p-6 text-center space-y-3">
        <p className="text-sm text-clay-600">面经库加载失败：{loadErr}</p>
        <button type="button" className="btn-primary" onClick={() => void reload()}>
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2">
        <input
          className="input max-w-[200px]"
          placeholder="搜索题目 / 公司…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
        <select
          className="input max-w-[140px]"
          value={companySel}
          onChange={(e) => setCompanySel(e.target.value)}
        >
          <option value="">全部公司</option>
          {companyOptions.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={roleSel}
          onChange={(e) => setRoleSel(e.target.value)}
        >
          <option value="">全部岗位</option>
          {roleOptions.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <select
          className="input max-w-[140px]"
          value={stageSel}
          onChange={(e) => setStageSel(e.target.value)}
        >
          <option value="">全部环节</option>
          {stageOptions.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        {hasAnyFilter && (
          <button
            type="button"
            className="text-xs text-ink-400 hover:text-clay-500"
            onClick={() => {
              setFilter("");
              setCompanySel("");
              setRoleSel("");
              setStageSel("");
            }}
          >
            清除筛选
          </button>
        )}
        <button type="button" className="btn-accent ml-auto" onClick={() => setOpen((v) => !v)}>
          {open ? "收起" : "+ 上传面经"}
        </button>
      </div>

      {open && (
        <section className="surface p-6 space-y-4">
          <div className="grid sm:grid-cols-2 gap-3">
            <Lbl label="公司">
              <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
            </Lbl>
            <Lbl label="岗位">
              <input className="input" value={role} onChange={(e) => setRole(e.target.value)} />
            </Lbl>
            <Lbl label="环节">
              <input
                className="input"
                placeholder="OA / 一面 / 终面…"
                value={stage}
                onChange={(e) => setStage(e.target.value)}
              />
            </Lbl>
            <Lbl label="来源 / 贡献者">
              <input
                className="input"
                value={contributor}
                onChange={(e) => setContributor(e.target.value)}
              />
            </Lbl>
            <div className="sm:col-span-2">
              <Lbl label="关联到投递（可选）">
                <select
                  className="input"
                  value={applicationId}
                  onChange={(e) => setApplicationId(e.target.value)}
                >
                  <option value="">
                    {suggestApp
                      ? `自动匹配：${suggestApp.company} · ${suggestApp.role}（不选即采用）`
                      : "不关联到具体投递"}
                  </option>
                  {apps.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.company} · {a.role}
                    </option>
                  ))}
                </select>
              </Lbl>
            </div>
          </div>
          <Lbl label="面经正文">
            <textarea
              className="textarea min-h-[220px]"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"逐题写：\n1. 自我介绍 ……\n2. 项目深挖 ……\n3. 反向提问 ……"}
            />
          </Lbl>
          <div className="flex items-center gap-3">
            <button className="btn-primary" disabled={busy || !content} onClick={() => void create()}>
              {busy ? "解析中…" : "保存并提取高频题"}
            </button>
            {err && <span className="text-sm text-clay-600">{err}</span>}
          </div>
        </section>
      )}

      {grouped.length === 0 ? (
        <p className="text-ink-300 text-sm">
          {hasAnyFilter ? "没有匹配的面经。" : "还没有面经。粘一份进来。"}
        </p>
      ) : (
        <ul className="space-y-6">
          {grouped.map(([co, items]) => {
            const linkedApp = apps.find((a) => a.company.toLowerCase() === co.toLowerCase());
            return (
              <li key={co}>
                <div className="flex items-baseline gap-3 mb-3">
                  <h3 className="font-serif text-xl text-ink-800">{co}</h3>
                  <span className="text-xs text-ink-400">{items.length} 份</span>
                  {linkedApp && (
                    <Link href={`/applications/${linkedApp.id}`} className="text-xs link">
                      → 同名投递「{linkedApp.role}」
                    </Link>
                  )}
                </div>
                <ul className="grid md:grid-cols-2 gap-3">
                  {items.map((e) => {
                    const boundApp = apps.find((a) => a.id === e.applicationId);
                    const highlights = Array.isArray(e.highlights) ? e.highlights : [];
                    return (
                      <li
                        key={e.id}
                        className={clsx("surface p-5", e.applicationId && "border-clay-200")}
                      >
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div>
                            <div className="label-eyebrow">{e.stage ?? "—"}</div>
                            <h4 className="font-serif text-base text-ink-800 mt-1">
                              {e.role ?? "未填岗位"}
                            </h4>
                            {boundApp && (
                              <Link
                                href={`/applications/${boundApp.id}`}
                                className="text-[11px] link mt-1 inline-block"
                              >
                                绑定到「{boundApp.role}」 →
                              </Link>
                            )}
                            {e.contributor && (
                              <div className="text-xs text-ink-400 mt-0.5">来源：{e.contributor}</div>
                            )}
                          </div>
                          <button className="btn-quiet text-clay-600" onClick={() => void del(e.id)}>
                            删除
                          </button>
                        </div>

                        {highlights.length > 0 && (
                          <ul className="list-disc pl-5 text-sm text-ink-600 space-y-1 mb-3">
                            {highlights.map((h, i) => (
                              <li key={i}>{h}</li>
                            ))}
                          </ul>
                        )}

                        <details className="text-sm text-ink-500">
                          <summary className="cursor-pointer text-xs text-ink-400 hover:text-ink-700">
                            原文
                          </summary>
                          <pre className="mt-2 whitespace-pre-wrap text-[12px] max-h-[260px] overflow-auto">
                            {e.content}
                          </pre>
                        </details>
                      </li>
                    );
                  })}
                </ul>
              </li>
            );
          })}
        </ul>
      )}
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
