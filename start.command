#!/bin/bash
# 一键启动开发服务器，并自动在浏览器打开 http://localhost:3000
set -e
cd "$(dirname "$0")"

if [ ! -d "node_modules" ]; then
  echo "node_modules/ 不存在。请先双击 install.command 安装依赖。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi

# 8 秒后打开浏览器（给 Next 启动留点时间）
(sleep 8 && open http://localhost:3000) &

echo ""
echo "=========================================="
echo "  Recruit Copilot · 已启动"
echo "  http://localhost:3000"
echo "  关闭此终端窗口即停止服务"
echo "=========================================="
echo ""

npm run dev
