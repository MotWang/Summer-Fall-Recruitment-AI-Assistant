#!/usr/bin/env node
/**
 * GitHub Codespaces 启动脚本：
 * 确保依赖已安装，并在 3055 端口启动 dev server。
 */
import { spawn, execSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const port = process.env.PORT ?? "3055";

process.chdir(root);

try {
  const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
  for (const pid of pids.split("\n").filter(Boolean)) {
    try {
      process.kill(Number(pid), "SIGTERM");
    } catch {
      /* already gone */
    }
  }
} catch {
  /* port free */
}

if (!existsSync(path.join(root, "node_modules"))) {
  console.log("[codespace] 安装依赖…");
  execSync("npm install", { stdio: "inherit" });
}

console.log(`[codespace] 启动开发服务器 http://localhost:${port}`);
console.log("[codespace] Codespaces 会自动转发端口并在浏览器中打开应用。");

const child = spawn("npm", ["run", "dev"], {
  cwd: root,
  stdio: "inherit",
  env: { ...process.env, PORT: port },
});

child.on("exit", (code) => process.exit(code ?? 0));
