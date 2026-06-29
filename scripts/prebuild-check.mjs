#!/usr/bin/env node
/** 禁止在 next start 仍运行时单独 build，否则会导致 CSS hash 不一致白屏 */
import { execSync } from "node:child_process";

const port = process.env.PORT ?? "3055";
try {
  execSync(`lsof -ti:${port}`, { stdio: "ignore" });
  console.error(
    `\n错误：端口 ${port} 上仍有服务在运行。\n` +
      "单独执行 npm run build 会与正在运行的 next start 冲突，导致白屏。\n" +
      "请使用：npm run serve  （会先停服务、再构建、再启动）\n",
  );
  process.exit(1);
} catch {
  /* port free */
}
