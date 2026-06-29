#!/usr/bin/env node
/**
 * 健康检查：页面 + CSS 静态资源必须同为 200，否则就是“白屏”根因。
 */
import { execSync } from "node:child_process";

const port = process.argv[2] ?? process.env.PORT ?? "3055";
const base = `http://localhost:${port}`;

function fail(msg) {
  console.error(`[doctor] FAIL: ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`[doctor] OK: ${msg}`);
}

try {
  execSync(`lsof -ti:${port}`, { stdio: "ignore" });
} catch {
  fail(`端口 ${port} 无服务在监听。请运行 npm run serve`);
}

const routes = ["/", "/applications", "/experiences", "/profile"];
for (const p of routes) {
  const r = await fetch(`${base}${p}`);
  if (!r.ok) fail(`${p} 返回 ${r.status}`);
  ok(`${p} → ${r.status}`);
}

const home = await (await fetch(`${base}/`)).text();
const m = home.match(/href="(\/_next\/static\/css\/[^"]+)"/);
if (!m) fail("首页 HTML 中找不到 CSS 链接");
const cssPath = m[1];
const cssRes = await fetch(`${base}${cssPath}`);
if (!cssRes.ok) {
  fail(
    `CSS 资源 ${cssPath} 返回 ${cssRes.status}。` +
      "这是白屏根因：服务进程与 .next 构建版本不一致。请执行 npm run serve 重启。",
  );
}
ok(`CSS ${cssPath} → ${cssRes.status}`);

console.log("\n[doctor] 全部通过，可以正常浏览。");
