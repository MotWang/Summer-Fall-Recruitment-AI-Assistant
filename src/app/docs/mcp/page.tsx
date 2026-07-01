import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { Markdown } from "@/components/markdown";
import { SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

function readMcpDocs(): string {
  const candidates = [
    path.join(process.cwd(), "mcp", "README.md"),
    path.join(process.cwd(), "..", "mcp", "README.md"),
  ];
  for (const p of candidates) {
    try {
      if (fs.existsSync(p)) return fs.readFileSync(p, "utf8");
    } catch {
      /* try next */
    }
  }
  return "# MCP 文档\n\n找不到 mcp/README.md，请联系管理员。";
}

export default function McpDocsPage() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3055";
  const md = readMcpDocs().replace(/https:\/\/你的域名/g, baseUrl.replace(/\/$/, ""));

  return (
    <div>
      <SectionTitle
        eyebrow="文档"
        title="MCP 接入指南"
        subtitle="OpenClaw / 外部 Agent 通过 MCP 解析 JD、写入看板、查询面试与日历。"
        right={
          <Link href="/settings" className="btn-ghost">
            ← 返回设置
          </Link>
        }
      />
      <article className="surface p-6 md:p-8 max-w-3xl">
        <Markdown source={md} />
      </article>
      <div className="mt-6 surface-quiet p-4 max-w-3xl text-sm text-ink-500 space-y-2">
        <p>
          <span className="font-medium text-ink-700">当前实例：</span>
          <code className="text-xs">{baseUrl}</code>
        </p>
        <p>
          HTTP 端点：<code className="text-xs">POST {baseUrl.replace(/\/$/, "")}/api/mcp</code>
        </p>
        <p className="text-xs">
          在设置页生成 MCP Key 后即可调用。GitHub 仓库文档可能未同步，以此页为准。
        </p>
      </div>
    </div>
  );
}
