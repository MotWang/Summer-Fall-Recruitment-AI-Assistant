#!/usr/bin/env node
/** 释放指定端口上的进程 */
import { execSync } from "node:child_process";

const port = process.argv[2] ?? process.env.PORT ?? "3055";
try {
  const pids = execSync(`lsof -ti:${port}`, { encoding: "utf8" }).trim();
  if (!pids) {
    console.log(`端口 ${port} 空闲`);
    process.exit(0);
  }
  for (const pid of pids.split("\n").filter(Boolean)) {
    try {
      process.kill(Number(pid), "SIGKILL");
      console.log(`已结束进程 ${pid}（端口 ${port}）`);
    } catch {
      /* already gone */
    }
  }
} catch {
  console.log(`端口 ${port} 空闲`);
}
