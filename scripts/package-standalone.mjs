#!/usr/bin/env node
/**
 * 打包 standalone 生产产物，供轻量服务器直接 node 运行（无需在服务器上 build）
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const out = path.join(root, "cloud-bundle", "standalone-app");

function rm(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function cp(src, dest) {
  fs.cpSync(src, dest, { recursive: true });
}

const standalone = path.join(root, ".next", "standalone");
if (!fs.existsSync(standalone)) {
  console.error("请先执行 npm run build");
  process.exit(1);
}

rm(out);
cp(standalone, out);
cp(path.join(root, ".next", "static"), path.join(out, ".next", "static"));
const publicDir = path.join(root, "public");
if (fs.existsSync(publicDir)) {
  cp(publicDir, path.join(out, "public"));
}

for (const mod of ["better-sqlite3", "bindings", "file-uri-to-path", "pdf-parse"]) {
  const src = path.join(root, "node_modules", mod);
  if (!fs.existsSync(src)) {
    console.error(`缺少原生模块: ${mod}，请先 npm ci`);
    process.exit(1);
  }
  cp(src, path.join(out, "node_modules", mod));
}

const startSh = `#!/bin/bash
set -e
cd "$(dirname "$0")"
export $(grep -v '^#' ../.env.production | xargs)
export RECRUIT_DB_PATH="$(cd ../data && pwd)/recruit.db"
export PORT=3055
export HOSTNAME=0.0.0.0
exec node server.js
`;
fs.writeFileSync(path.join(out, "start.sh"), startSh, { mode: 0o755 });

const ecosystem = {
  apps: [
    {
      name: "recruit-copilot",
      script: "./start.sh",
      interpreter: "bash",
      cwd: "./standalone-app",
      autorestart: true,
      max_memory_restart: "512M",
    },
  ],
};
fs.writeFileSync(
  path.join(root, "cloud-bundle", "ecosystem.config.cjs"),
  `module.exports = ${JSON.stringify(ecosystem, null, 2)};\n`
);

// 打包 tar.gz 便于上传（COPYFILE_DISABLE 避免 Mac xattr 在 Linux 解压时报错）
const tarPath = path.join(root, "cloud-bundle", "deploy-bundle.tar.gz");
execSync(
  `COPYFILE_DISABLE=1 tar -czf "${tarPath}" -C "${path.join(root, "cloud-bundle")}" standalone-app ecosystem.config.cjs data .env.production`,
  { stdio: "inherit", env: { ...process.env, COPYFILE_DISABLE: "1" } },
);

// 文档随部署包带上（供 /docs/mcp 读取，位于 standalone-app/mcp/）
const mcpReadme = path.join(root, "mcp", "README.md");
const mcpDest = path.join(out, "mcp", "README.md");
if (fs.existsSync(mcpReadme)) {
  fs.mkdirSync(path.dirname(mcpDest), { recursive: true });
  fs.copyFileSync(mcpReadme, mcpDest);
}

const stat = fs.statSync(tarPath);
console.log(`\n=== 部署包已就绪 ===`);
console.log(`  ${tarPath} (${(stat.size / 1024 / 1024).toFixed(1)} MB)`);
console.log(`\n上传到服务器后执行 deploy/install-lite.sh\n`);
