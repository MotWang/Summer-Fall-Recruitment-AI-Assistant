"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { AppSettings } from "@/lib/types";

interface Init {
  anthropicApiKeyMasked: string | null;
  anthropicModel: string;
  bedrockApiKeyMasked: string | null;
  bedrockBaseUrl: string;
  bedrockModel: string;
  bedrockRegion: string;
  theme: NonNullable<AppSettings["theme"]>;
  accent: NonNullable<AppSettings["accent"]>;
}

const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-8", label: "Opus 4.8 — 最强（贵）" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6 — 推荐（默认）" },
  { id: "claude-sonnet-4-5", label: "Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5 — 最便宜" },
];

const BEDROCK_MODELS = [
  { id: "global.anthropic.claude-opus-4-7", label: "Claude Opus 4.7（小红书 MaaS）" },
  { id: "global.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
];

export function SettingsForm({
  initialSettings,
  provider,
  dbPath,
}: {
  initialSettings: Init;
  provider: "anthropic" | "bedrock" | "mock";
  dbPath: string;
}) {
  const router = useRouter();

  const [aiMode, setAiMode] = useState<"bedrock" | "anthropic">(
    provider === "anthropic" ? "anthropic" : "bedrock",
  );

  // —— Bedrock ——
  const [bedrockBaseUrl, setBedrockBaseUrl] = useState(initialSettings.bedrockBaseUrl);
  const [bedrockKeyInput, setBedrockKeyInput] = useState("");
  const [showBedrockKey, setShowBedrockKey] = useState(false);
  const [bedrockModel, setBedrockModel] = useState(initialSettings.bedrockModel);
  const [bedrockRegion, setBedrockRegion] = useState(initialSettings.bedrockRegion);

  // —— Anthropic ——
  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(initialSettings.anthropicModel);

  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  // —— 外观 ——
  const [theme, setTheme] = useState(initialSettings.theme);
  const [accent, setAccent] = useState(initialSettings.accent);

  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  async function saveKey() {
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const body =
        aiMode === "bedrock"
          ? {
              bedrockBaseUrl: bedrockBaseUrl.trim(),
              bedrockApiKey: bedrockKeyInput || undefined,
              bedrockModel: bedrockModel.trim(),
              bedrockRegion: bedrockRegion.trim(),
            }
          : {
              anthropicApiKey: keyInput || undefined,
              anthropicModel: model,
            };
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setKeyInput("");
      setBedrockKeyInput("");
      setKeyMsg("已保存。下一次调用 AI 时即时生效。");
      router.refresh();
    } catch (e) {
      setKeyMsg(`保存失败：${(e as Error).message}`);
    } finally {
      setSavingKey(false);
    }
  }

  async function testConnection() {
    setTesting(true);
    setTestMsg(null);
    try {
      const body =
        aiMode === "bedrock"
          ? {
              provider: "bedrock" as const,
              bedrockBaseUrl: bedrockBaseUrl.trim(),
              bedrockApiKey: bedrockKeyInput || undefined,
              bedrockModel: bedrockModel.trim(),
              bedrockRegion: bedrockRegion.trim(),
            }
          : {
              provider: "anthropic" as const,
              apiKey: keyInput || undefined,
              model,
            };
      const r = await fetch("/api/settings/test-anthropic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setTestMsg(`✓ 连通 · ${j.data.model} 回复：${j.data.output.slice(0, 40)}`);
    } catch (e) {
      setTestMsg(`✗ ${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  async function clearKey() {
    if (!confirm(`确定清空已保存的 ${aiMode === "bedrock" ? "Bedrock" : "Anthropic"} 配置？`)) return;
    const body =
      aiMode === "bedrock"
        ? { bedrockApiKey: "", bedrockBaseUrl: "", bedrockModel: "", bedrockRegion: "" }
        : { anthropicApiKey: "" };
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    setKeyMsg("已清空。当前回落到 mock provider（若 env 无配置）。");
    router.refresh();
  }

  async function saveAppearance() {
    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ theme, accent }),
    });
    router.refresh();
  }

  const hasSavedKey =
    aiMode === "bedrock" ? !!initialSettings.bedrockApiKeyMasked : !!initialSettings.anthropicApiKeyMasked;
  const activeProvider = provider !== "mock";

  return (
    <div className="space-y-8 max-w-3xl">
      {/* —— API 接入 —— */}
      <section className="surface p-6 space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <div className="label-eyebrow">API · AI Provider</div>
            <h2 className="display-2 mt-1">接入 Claude</h2>
            <p className="text-sm text-ink-500 mt-2">
              支持小红书 MaaS Bedrock 代理或 Anthropic 直连。配置后，JD 解析 / 简历优化 / 面试准备均由模型生成；不填则使用本地 mock。
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={clsx(
                "h-2 w-2 rounded-full",
                activeProvider ? "bg-clay-400" : "bg-ink-200",
              )}
            />
            <span className="text-xs text-ink-500">当前：{provider}</span>
          </div>
        </header>

        <div>
          <div className="field-label mb-2">接入方式</div>
          <div className="flex gap-2">
            {(
              [
                { id: "bedrock" as const, label: "小红书 Bedrock（MaaS）" },
                { id: "anthropic" as const, label: "Anthropic 直连" },
              ] as const
            ).map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setAiMode(m.id)}
                className={clsx(
                  "px-3 py-1.5 rounded-full text-xs border transition",
                  aiMode === m.id
                    ? "bg-ink-700 text-ivory-50 border-ink-700"
                    : "border-ink-100 text-ink-500 hover:border-ink-200",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {aiMode === "bedrock" ? (
          <>
            <Lbl label="BEDROCK_BASE_URL">
              <input
                className="input"
                placeholder="https://maas.devops.rednote.life/cowork/"
                value={bedrockBaseUrl}
                onChange={(e) => setBedrockBaseUrl(e.target.value)}
              />
            </Lbl>

            <Lbl label="BEDROCK_API_KEY">
              <div className="flex gap-2">
                <input
                  className="input"
                  type={showBedrockKey ? "text" : "password"}
                  placeholder={
                    initialSettings.bedrockApiKeyMasked
                      ? `已保存 · ${initialSettings.bedrockApiKeyMasked}（输入新值会替换）`
                      : "MAAS…"
                  }
                  value={bedrockKeyInput}
                  onChange={(e) => setBedrockKeyInput(e.target.value)}
                />
                <button
                  className="btn-quiet text-xs"
                  type="button"
                  onClick={() => setShowBedrockKey((v) => !v)}
                >
                  {showBedrockKey ? "隐藏" : "显示"}
                </button>
              </div>
            </Lbl>

            <div className="grid sm:grid-cols-2 gap-4">
              <Lbl label="模型 ID">
                <select
                  className="input"
                  value={bedrockModel}
                  onChange={(e) => setBedrockModel(e.target.value)}
                >
                  {BEDROCK_MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Lbl>
              <Lbl label="AWS Region">
                <input
                  className="input"
                  placeholder="ap-northeast-1"
                  value={bedrockRegion}
                  onChange={(e) => setBedrockRegion(e.target.value)}
                />
              </Lbl>
            </div>
          </>
        ) : (
          <>
            <Lbl label="ANTHROPIC_API_KEY">
              <div className="flex gap-2">
                <input
                  className="input"
                  type={showKey ? "text" : "password"}
                  placeholder={
                    initialSettings.anthropicApiKeyMasked
                      ? `已保存 · ${initialSettings.anthropicApiKeyMasked}（输入新值会替换）`
                      : "sk-ant-…"
                  }
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                />
                <button className="btn-quiet text-xs" type="button" onClick={() => setShowKey((v) => !v)}>
                  {showKey ? "隐藏" : "显示"}
                </button>
              </div>
            </Lbl>

            <Lbl label="模型">
              <select className="input" value={model} onChange={(e) => setModel(e.target.value)}>
                {ANTHROPIC_MODELS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ))}
              </select>
            </Lbl>
          </>
        )}

        <div className="flex items-center gap-2">
          <button className="btn-primary" disabled={savingKey} onClick={saveKey}>
            {savingKey ? "保存中…" : "保存"}
          </button>
          <button className="btn-ghost" disabled={testing} onClick={testConnection}>
            {testing ? "测试中…" : "测试连通"}
          </button>
          {hasSavedKey && (
            <button className="btn-quiet text-clay-600" onClick={clearKey}>
              清空配置
            </button>
          )}
        </div>
        {keyMsg && <p className="text-xs text-ink-500">{keyMsg}</p>}
        {testMsg && (
          <p className={clsx("text-xs", testMsg.startsWith("✓") ? "text-clay-600" : "text-clay-700")}>
            {testMsg}
          </p>
        )}
      </section>

      {/* —— 外观 —— */}
      <section className="surface p-6 space-y-5">
        <header>
          <div className="label-eyebrow">APPEARANCE</div>
          <h2 className="display-2 mt-1">外观</h2>
        </header>

        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <div className="field-label mb-2">主题</div>
            <div className="flex gap-2">
              {(["light", "dark", "system"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={clsx(
                    "px-3 py-1.5 rounded-full text-xs border transition",
                    theme === t
                      ? "bg-ink-700 text-ivory-50 border-ink-700"
                      : "border-ink-100 text-ink-500 hover:border-ink-200",
                  )}
                >
                  {t === "light" ? "明亮" : t === "dark" ? "暗色" : "跟随系统"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="field-label mb-2">强调色</div>
            <div className="flex gap-2">
              {(["clay", "sage", "slate"] as const).map((a) => (
                <button
                  key={a}
                  onClick={() => setAccent(a)}
                  className={clsx(
                    "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border transition",
                    accent === a
                      ? "bg-ink-700 text-ivory-50 border-ink-700"
                      : "border-ink-100 text-ink-500 hover:border-ink-200",
                  )}
                >
                  <span
                    className={clsx(
                      "h-2.5 w-2.5 rounded-full",
                      a === "clay" && "bg-[#CC785C]",
                      a === "sage" && "bg-[#8AA17B]",
                      a === "slate" && "bg-[#6F7B8A]",
                    )}
                  />
                  {a === "clay" ? "陶土橙" : a === "sage" ? "青苔绿" : "石板蓝"}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button className="btn-primary" onClick={saveAppearance}>
          保存外观
        </button>
      </section>

      {/* —— 数据 —— */}
      <section className="surface p-6 space-y-4">
        <header>
          <div className="label-eyebrow">DATA</div>
          <h2 className="display-2 mt-1">数据</h2>
          <p className="text-sm text-ink-500 mt-2">
            所有数据保存在本地 SQLite 单文件。备份这个文件即等于全量备份。
          </p>
        </header>

        <div className="surface-quiet p-4 font-mono text-xs text-ink-500 overflow-x-auto">{dbPath}</div>

        <div className="flex flex-wrap gap-2">
          <a className="btn-primary" href="/api/export" download>
            导出 JSON 快照
          </a>
        </div>
      </section>

      <section className="surface-quiet p-5 text-xs text-ink-400">
        Recruit Copilot · 2027 Summer & Fall · 本地优先 · 数据不离开你的设备。
      </section>
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

function applyTheme(theme: Init["theme"], accent: Init["accent"]) {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  const effective =
    theme === "system"
      ? window.matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light"
      : theme;
  html.dataset.theme = effective;
  html.dataset.accent = accent;
}
