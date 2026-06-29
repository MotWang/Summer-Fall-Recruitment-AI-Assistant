#!/bin/bash
# 一键启动（生产模式）。勿在 Cursor 里单独跑 npm run build，否则会白屏。
set -e
cd "$(dirname "$0")"

PORT=3055

if [ ! -d "node_modules" ]; then
  echo "node_modules/ 不存在。请先双击 install.command 安装依赖。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi

(sleep 8 && open "http://localhost:${PORT}" >/dev/null 2>&1 || true) &

echo ""
echo "=========================================="
echo "  Recruit Copilot · 启动中（生产模式）"
echo "  http://localhost:${PORT}"
echo "  关闭此终端窗口即停止服务"
echo "=========================================="
echo ""

PORT=$PORT npm run serve
