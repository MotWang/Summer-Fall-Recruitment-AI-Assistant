"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import type { AppSettings, AiProviderId } from "@/lib/types";
import {
  AI_PROVIDER_OPTIONS,
  ANTHROPIC_MODELS,
  GATEWAY_MODELS,
  GATEWAY_PRESETS,
  OPENROUTER_MODELS,
  type GatewayPresetId,
} from "@/lib/ai/provider-meta";

interface Init {
  aiProvider: AiProviderId;
  anthropicApiKeyMasked: string | null;
  anthropicModel: string;
  bedrockApiKeyMasked: string | null;
  bedrockBaseUrl: string;
  bedrockModel: string;
  bedrockRegion: string;
  openrouterApiKeyMasked: string | null;
  openrouterModel: string;
  openrouterBaseUrl: string;
  theme: NonNullable<AppSettings["theme"]>;
  accent: NonNullable<AppSettings["accent"]>;
}

export function SettingsForm({
  initialSettings,
  activeProvider,
  activeProviderLabel,
  dbPath,
}: {
  initialSettings: Init;
  activeProvider: AiProviderId;
  activeProviderLabel: string;
  dbPath: string;
}) {
  const router = useRouter();

  const [aiMode, setAiMode] = useState<AiProviderId>(initialSettings.aiProvider);

  const [bedrockBaseUrl, setBedrockBaseUrl] = useState(initialSettings.bedrockBaseUrl);
  const [bedrockKeyInput, setBedrockKeyInput] = useState("");
  const [showBedrockKey, setShowBedrockKey] = useState(false);
  const [bedrockModel, setBedrockModel] = useState(initialSettings.bedrockModel);
  const [bedrockRegion, setBedrockRegion] = useState(initialSettings.bedrockRegion);
  const [gatewayPreset, setGatewayPreset] = useState<GatewayPresetId>("custom");

  const [keyInput, setKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [model, setModel] = useState(initialSettings.anthropicModel);

  const [openrouterKeyInput, setOpenrouterKeyInput] = useState("");
  const [showOpenrouterKey, setShowOpenrouterKey] = useState(false);
  const [openrouterModel, setOpenrouterModel] = useState(initialSettings.openrouterModel);
  const [openrouterBaseUrl, setOpenrouterBaseUrl] = useState(initialSettings.openrouterBaseUrl);

  const [savingKey, setSavingKey] = useState(false);
  const [keyMsg, setKeyMsg] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [testMsg, setTestMsg] = useState<string | null>(null);

  const [theme, setTheme] = useState(initialSettings.theme);
  const [accent, setAccent] = useState(initialSettings.accent);

  useEffect(() => {
    applyTheme(theme, accent);
  }, [theme, accent]);

  function applyGatewayPreset(id: GatewayPresetId) {
    setGatewayPreset(id);
    const preset = GATEWAY_PRESETS.find((p) => p.id === id);
    if (!preset || id === "custom") return;
    if (preset.baseUrl) setBedrockBaseUrl(preset.baseUrl);
    setBedrockRegion(preset.region);
    setBedrockModel(preset.model);
  }

  function buildProviderPayload(): Partial<AppSettings> {
    const base = { aiProvider: aiMode };
    switch (aiMode) {
      case "anthropic":
        return {
          ...base,
          anthropicApiKey: keyInput || undefined,
          anthropicModel: model,
        };
      case "gateway":
        return {
          ...base,
          bedrockBaseUrl: bedrockBaseUrl.trim(),
          bedrockApiKey: bedrockKeyInput || undefined,
          bedrockModel: bedrockModel.trim(),
          bedrockRegion: bedrockRegion.trim(),
        };
      case "openrouter":
        return {
          ...base,
          openrouterBaseUrl: openrouterBaseUrl.trim(),
          openrouterApiKey: openrouterKeyInput || undefined,
          openrouterModel: openrouterModel.trim(),
        };
      default:
        return base;
    }
  }

  function buildTestPayload() {
    switch (aiMode) {
      case "gateway":
        return {
          provider: "gateway" as const,
          bedrockBaseUrl: bedrockBaseUrl.trim(),
          bedrockApiKey: bedrockKeyInput || undefined,
          bedrockModel: bedrockModel.trim(),
          bedrockRegion: bedrockRegion.trim(),
        };
      case "openrouter":
        return {
          provider: "openrouter" as const,
          openrouterBaseUrl: openrouterBaseUrl.trim(),
          openrouterApiKey: openrouterKeyInput || undefined,
          openrouterModel: openrouterModel.trim(),
        };
      case "mock":
        return { provider: "mock" as const };
      default:
        return {
          provider: "anthropic" as const,
          apiKey: keyInput || undefined,
          model,
        };
    }
  }

  async function saveKey() {
    setSavingKey(true);
    setKeyMsg(null);
    try {
      const r = await fetch("/api/settings", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildProviderPayload()),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setKeyInput("");
      setBedrockKeyInput("");
      setOpenrouterKeyInput("");
      setKeyMsg(aiMode === "mock" ? "已切换为本地 Mock。" : "已保存。下一次调用 AI 时即时生效。");
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
      const r = await fetch("/api/settings/test-anthropic", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(buildTestPayload()),
      });
      const j = await r.json();
      if (!j.ok) throw new Error(j.error);
      setTestMsg(`连通 · ${j.data.model} 回复：${j.data.output.slice(0, 40)}`);
    } catch (e) {
      setTestMsg(`${(e as Error).message}`);
    } finally {
      setTesting(false);
    }
  }

  async function clearKey() {
    const label = AI_PROVIDER_OPTIONS.find((o) => o.id === aiMode)?.label ?? aiMode;
    if (aiMode === "mock") return;
    if (!confirm(`确定清空「${label}」已保存的配置？`)) return;

    const clearBody: Partial<AppSettings> = { aiProvider: "mock" };
    if (aiMode === "gateway") {
      Object.assign(clearBody, {
        bedrockApiKey: "",
        bedrockBaseUrl: "",
        bedrockModel: "",
        bedrockRegion: "",
      });
    } else if (aiMode === "openrouter") {
      Object.assign(clearBody, {
        openrouterApiKey: "",
        openrouterModel: "",
        openrouterBaseUrl: "",
      });
    } else {
      clearBody.anthropicApiKey = "";
    }

    await fetch("/api/settings", {
      method: "PUT",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(clearBody),
    });
    setKeyMsg("已清空，当前回落到本地 Mock。");
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
    aiMode === "gateway"
      ? !!initialSettings.bedrockApiKeyMasked
      : aiMode === "openrouter"
        ? !!initialSettings.openrouterApiKeyMasked
        : aiMode === "anthropic"
          ? !!initialSettings.anthropicApiKeyMasked
          : false;

  const isActive = activeProvider !== "mock";

  return (
    <div className="space-y-8 max-w-3xl">
      <section className="surface p-6 space-y-5">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="label-eyebrow">API · AI</div>
            <h2 className="display-2 mt-1">模型接入</h2>
            <p className="text-sm text-ink-500 mt-2 max-w-xl">
              选择一种接入方式并保存。JD 解析、简历优化、面试准备等均走所选模型；未配置密钥时使用本地 Mock。
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span
              className={clsx("h-2 w-2 rounded-full", isActive ? "bg-clay-400" : "bg-ink-200")}
            />
            <span className="text-xs text-ink-500">当前生效：{activeProviderLabel}</span>
          </div>
        </header>

        <div className="grid sm:grid-cols-2 gap-2">
          {AI_PROVIDER_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAiMode(opt.id)}
              className={clsx(
                "text-left p-4 rounded-xl border transition",
                aiMode === opt.id
                  ? "border-ink-700 bg-ink-700/5 ring-1 ring-ink-700"
                  : "border-ink-100 hover:border-ink-200",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-800">{opt.label}</span>
                {activeProvider === opt.id && (
                  <span className="text-[10px] uppercase tracking-wide text-clay-600">生效中</span>
                )}
              </div>
              <p className="text-xs text-ink-500 mt-1">{opt.hint}</p>
            </button>
          ))}
        </div>

        <div className="border-t border-ink-100 pt-5 space-y-4">
          {aiMode === "mock" && (
            <p className="text-sm text-ink-500">
              本地 Mock 使用规则与模板生成内容，不消耗 API 额度，适合离线或调试。保存后即可生效。
            </p>
          )}

          {aiMode === "anthropic" && (
            <>
              <Lbl label="API Key">
                <SecretInput
                  show={showKey}
                  onToggle={() => setShowKey((v) => !v)}
                  placeholder={
                    initialSettings.anthropicApiKeyMasked
                      ? `已保存 · ${initialSettings.anthropicApiKeyMasked}`
                      : "sk-ant-…"
                  }
                  value={keyInput}
                  onChange={setKeyInput}
                />
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

          {aiMode === "gateway" && (
            <>
              <Lbl label="网关类型">
                <div className="flex flex-wrap gap-2">
                  {GATEWAY_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyGatewayPreset(p.id)}
                      className={clsx(
                        "px-3 py-1.5 rounded-full text-xs border transition",
                        gatewayPreset === p.id
                          ? "bg-ink-700 text-ivory-50 border-ink-700"
                          : "border-ink-100 text-ink-500 hover:border-ink-200",
                      )}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </Lbl>

              <Lbl label="Base URL">
                <input
                  className="input"
                  placeholder="https://your-gateway.example.com/cowork/"
                  value={bedrockBaseUrl}
                  onChange={(e) => setBedrockBaseUrl(e.target.value)}
                />
              </Lbl>

              <Lbl label="API Key">
                <SecretInput
                  show={showBedrockKey}
                  onToggle={() => setShowBedrockKey((v) => !v)}
                  placeholder={
                    initialSettings.bedrockApiKeyMasked
                      ? `已保存 · ${initialSettings.bedrockApiKeyMasked}`
                      : "Bearer token…"
                  }
                  value={bedrockKeyInput}
                  onChange={setBedrockKeyInput}
                />
              </Lbl>

              <div className="grid sm:grid-cols-2 gap-4">
                <Lbl label="模型 ID">
                  <select
                    className="input"
                    value={bedrockModel}
                    onChange={(e) => setBedrockModel(e.target.value)}
                  >
                    {GATEWAY_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Lbl>
                <Lbl label="Region（可选）">
                  <input
                    className="input"
                    placeholder="ap-northeast-1"
                    value={bedrockRegion}
                    onChange={(e) => setBedrockRegion(e.target.value)}
                  />
                </Lbl>
              </div>
            </>
          )}

          {aiMode === "openrouter" && (
            <>
              <Lbl label="API Key">
                <SecretInput
                  show={showOpenrouterKey}
                  onToggle={() => setShowOpenrouterKey((v) => !v)}
                  placeholder={
                    initialSettings.openrouterApiKeyMasked
                      ? `已保存 · ${initialSettings.openrouterApiKeyMasked}`
                      : "sk-or-…"
                  }
                  value={openrouterKeyInput}
                  onChange={setOpenrouterKeyInput}
                />
              </Lbl>
              <div className="grid sm:grid-cols-2 gap-4">
                <Lbl label="模型">
                  <select
                    className="input"
                    value={openrouterModel}
                    onChange={(e) => setOpenrouterModel(e.target.value)}
                  >
                    {OPENROUTER_MODELS.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </Lbl>
                <Lbl label="API Base（可选）">
                  <input
                    className="input"
                    placeholder="https://openrouter.ai/api/v1"
                    value={openrouterBaseUrl}
                    onChange={(e) => setOpenrouterBaseUrl(e.target.value)}
                  />
                </Lbl>
              </div>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button className="btn-primary" disabled={savingKey} onClick={saveKey}>
            {savingKey ? "保存中…" : "保存并启用"}
          </button>
          {aiMode !== "mock" && (
            <button className="btn-ghost" disabled={testing} onClick={testConnection}>
              {testing ? "测试中…" : "测试连通"}
            </button>
          )}
          {hasSavedKey && aiMode !== "mock" && (
            <button className="btn-quiet text-clay-600" onClick={clearKey}>
              清空配置
            </button>
          )}
        </div>
        {keyMsg && <p className="text-xs text-ink-500">{keyMsg}</p>}
        {testMsg && (
          <p className={clsx("text-xs", testMsg.startsWith("连通") ? "text-clay-600" : "text-clay-700")}>
            {testMsg}
          </p>
        )}
      </section>

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

function SecretInput({
  value,
  onChange,
  placeholder,
  show,
  onToggle,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  show: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex gap-2">
      <input
        className="input"
        type={show ? "text" : "password"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      <button className="btn-quiet text-xs" type="button" onClick={onToggle}>
        {show ? "隐藏" : "显示"}
      </button>
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
