"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

export function IntegrationsPanel({ googleQuery }: { googleQuery?: string }) {
  const [mcpMasked, setMcpMasked] = useState<string | null>(null);
  const [mcpKey, setMcpKey] = useState<string | null>(null);
  const [mcpMsg, setMcpMsg] = useState<string | null>(null);
  const [google, setGoogle] = useState<{ connected: boolean; configured: boolean } | null>(null);
  const [syncMsg, setSyncMsg] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/settings/mcp")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setMcpMasked(j.data.keyMasked);
      });
    fetch("/api/calendar/google/sync")
      .then((r) => r.json())
      .then((j) => {
        if (j.ok) setGoogle(j.data);
      });
  }, []);

  async function genMcpKey() {
    setMcpMsg(null);
    const r = await fetch("/api/settings/mcp", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ regenerate: Boolean(mcpMasked) }),
    });
    const j = await r.json();
    if (!j.ok) {
      setMcpMsg(j.error);
      return;
    }
    setMcpKey(j.data.mcpApiKey);
    setMcpMasked(`${j.data.mcpApiKey.slice(0, 8)}…${j.data.mcpApiKey.slice(-4)}`);
    setMcpMsg("已生成。请立即复制保存，刷新后不再显示完整 Key。");
  }

  async function connectGoogle() {
    const r = await fetch("/api/calendar/google/auth");
    const j = await r.json();
    if (j.ok) window.location.href = j.data.url;
    else setSyncMsg(j.error);
  }

  async function syncGoogle() {
    setSyncMsg(null);
    const r = await fetch("/api/calendar/google/sync", { method: "POST" });
    const j = await r.json();
    setSyncMsg(j.ok ? `已同步 ${j.data.pushed} 场面试` : j.error);
  }

  return (
    <>
      <section className="surface p-6 space-y-4">
        <header>
          <div className="label-eyebrow">MCP · OpenClaw</div>
          <h2 className="display-2 mt-1">外部 Agent 接入</h2>
          <p className="text-sm text-ink-500 mt-2">
            供 OpenClaw 等产品通过 MCP 解析 JD/PDF 并写入看板。详见{" "}
            <Link className="link" href="/docs/mcp">
              MCP 接入指南
            </Link>
          </p>
        </header>
        <div className="surface-quiet p-4 text-xs font-mono text-ink-500 space-y-2">
          <div>stdio: npm run mcp（本地）</div>
          <div>
            HTTP: POST {typeof window !== "undefined" ? window.location.origin : ""}/api/mcp · Authorization:
            Bearer &lt;key&gt;
          </div>
          <div className="text-ink-400 font-sans text-[11px]">
            云部署请在下方生成 Key，用 HTTP 模式连接；Key 与当前登录账号绑定。
          </div>
        </div>
        {mcpMasked && !mcpKey && <p className="text-xs text-ink-500">当前 Key：{mcpMasked}</p>}
        {mcpKey && (
          <div className="surface-quiet p-3 font-mono text-xs break-all text-clay-700">{mcpKey}</div>
        )}
        <button className="btn-primary" onClick={genMcpKey}>
          {mcpMasked ? "重新生成 MCP Key" : "生成 MCP Key"}
        </button>
        <Link href="/docs/mcp" className="btn-ghost text-sm inline-block">
          查看完整接入文档 →
        </Link>
        {mcpMsg && <p className="text-xs text-ink-500">{mcpMsg}</p>}
      </section>

      <section className="surface p-6 space-y-4">
        <header>
          <div className="label-eyebrow">CALENDAR · Google</div>
          <h2 className="display-2 mt-1">Google Calendar 同步</h2>
          <p className="text-sm text-ink-500 mt-2">
            将面试安排同步到 Google Calendar。需在环境变量配置 GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET。
          </p>
        </header>
        {googleQuery === "connected" && (
          <p className="text-sm text-clay-600">Google Calendar 已连接。</p>
        )}
        {googleQuery === "error" && (
          <p className="text-sm text-clay-700">Google 授权失败，请重试。</p>
        )}
        <div className="flex flex-wrap gap-2">
          {google?.connected ? (
            <>
              <span className="text-xs text-clay-600 self-center">已连接</span>
              <button className="btn-ghost" onClick={syncGoogle}>
                立即同步面试
              </button>
              <Link className="btn-quiet text-sm" href="/calendar">
                打开日历
              </Link>
            </>
          ) : google?.configured === false ? (
            <div className="space-y-3 w-full">
              <p className="text-xs text-ink-400">
                无法直接跳转 Google 登录。OAuth 需要先在 Google Cloud 创建应用，并在服务器环境变量中配置
                Client ID / Secret 后，「连接 Google Calendar」按钮才会出现。
              </p>
              <details className="text-xs text-ink-500 surface-quiet p-3 rounded-lg">
                <summary className="cursor-pointer text-ink-600 font-medium">配置步骤（管理员一次性操作）</summary>
                <ol className="mt-2 space-y-1.5 list-decimal list-inside">
                  <li>
                    打开{" "}
                    <a
                      className="link"
                      href="https://console.cloud.google.com/apis/credentials"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Google Cloud Console → 凭据
                    </a>
                  </li>
                  <li>创建 OAuth 客户端 ID（类型：Web 应用）</li>
                  <li>
                    授权重定向 URI 填：
                    <code className="block mt-1 p-2 bg-ivory-100 rounded text-[11px] break-all">
                      {typeof window !== "undefined"
                        ? `${window.location.origin}/api/calendar/google/callback`
                        : "https://你的域名/api/calendar/google/callback"}
                    </code>
                  </li>
                  <li>
                    在服务器 <code className="text-[11px]">.env.production</code> 添加
                    GOOGLE_CLIENT_ID、GOOGLE_CLIENT_SECRET、GOOGLE_REDIRECT_URI，重启服务
                  </li>
                  <li>回到此页点击「连接 Google Calendar」→ 跳转 Google 授权</li>
                </ol>
              </details>
            </div>
          ) : (
            <button className="btn-primary" onClick={connectGoogle}>
              连接 Google Calendar
            </button>
          )}
        </div>
        {syncMsg && <p className="text-xs text-ink-500">{syncMsg}</p>}
      </section>
    </>
  );
}
