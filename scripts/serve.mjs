#!/usr/bin/env node
/**
 * 原子化生产启动：先杀端口 → 清 .next → build → start
 * 避免“HTML 引用旧 CSS hash、磁盘已是新构建”导致的白屏。
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const port = process.env.PORT ?? "3055";

function run(cmd, args, opts = {}) {
  execSync([cmd, ...args].join(" "), { cwd: root, stdio: "inherit", ...opts });
}

console.log("\n=== Recruit Copilot · 生产模式启动 ===\n");

// 1) 释放端口
run("node", ["scripts/kill-port.mjs", port]);

// 2) 若存在锁文件说明上次异常，仍继续
const lockPath = path.join(root, ".serve.lock");
if (existsSync(lockPath)) {
  console.warn("警告：发现 .serve.lock，上次启动可能未完成。");
}

// 3) 干净构建
console.log("\n→ 清理 .next 并构建…\n");
run("rm", ["-rf", ".next"]);
run("npm", ["run", "build"]);

// 4) 再次确保端口空闲（build 期间不应有服务，双保险）
run("node", ["scripts/kill-port.mjs", port]);

const buildId = readFileSync(path.join(root, ".next/BUILD_ID"), "utf8").trim();
console.log(`\n→ BUILD_ID: ${buildId}`);
console.log(`→ 启动 next start -p ${port}\n`);

// 5) 启动服务（前台，供 start.command 保持窗口）
const child = spawn("npx", ["next", "start", "-p", port], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 0));

// 6) 后台健康检查（启动后 3s）
setTimeout(async () => {
  try {
    const home = await (await fetch(`http://localhost:${port}/`)).text();
    const m = home.match(/href="(\/_next\/static\/css\/[^"]+)"/);
    if (!m) {
      console.error("\n[serve] 警告：无法验证 CSS，请手动运行 npm run doctor\n");
      return;
    }
    const cssRes = await fetch(`http://localhost:${port}${m[1]}`);
    if (cssRes.ok) {
      console.log(`\n[serve] 健康检查通过 · http://localhost:${port}\n`);
    } else {
      console.error(
        `\n[serve] 警告：CSS 返回 ${cssRes.status}，页面可能白屏。请 Ctrl+C 后重试 npm run serve\n`,
      );
    }
  } catch {
    /* server still warming */
  }
}, 3000);
