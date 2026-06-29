#!/bin/bash
# 一键安装依赖。双击运行即可（macOS 会用 Terminal 打开）。
set -e
cd "$(dirname "$0")"

echo ""
echo "=========================================="
echo "  Recruit Copilot · 依赖安装"
echo "=========================================="
echo ""

# 1) 检查 Node
if ! command -v node >/dev/null 2>&1; then
  echo "❌ 没找到 Node.js。"
  echo "   请先安装 Node 18+：https://nodejs.org/  或 brew install node"
  echo ""
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi

NODE_MAJOR=$(node -p "process.versions.node.split('.')[0]")
if [ "$NODE_MAJOR" -lt 18 ]; then
  echo "❌ Node.js 版本过低（当前 $(node -v)）。请升级到 18 或更高。"
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi
echo "✓ Node $(node -v)"
echo "✓ npm $(npm -v)"
echo ""

# 2) 检查 Xcode CLI（better-sqlite3 编译依赖）
if ! xcode-select -p >/dev/null 2>&1; then
  echo "⚠  没检测到 Xcode Command Line Tools。"
  echo "   better-sqlite3 可能需要它来编译。"
  echo "   现在会弹出系统对话框引导你安装；安装完成后回到这里继续。"
  echo ""
  xcode-select --install || true
  echo ""
  read -n 1 -s -r -p "Xcode CLI 安装完成后，按任意键继续…"
  echo ""
fi

# 3) 安装依赖；如果原生编译失败，退回到 pnpm 预编译版本（如果有的话）
echo "→ 正在安装 npm 依赖（首次可能要一两分钟）…"
echo ""
if npm install --no-audit --no-fund; then
  echo ""
  echo "✓ 依赖安装完成"
else
  echo ""
  echo "❌ npm install 失败。"
  echo ""
  echo "  最常见原因是 better-sqlite3 原生编译失败。"
  echo "  请尝试："
  echo "    1) 确认 Xcode CLI 已装好：xcode-select -p"
  echo "    2) 重新运行本脚本"
  echo "  或者在终端中手动跑：npm install --build-from-source"
  echo ""
  read -n 1 -s -r -p "按任意键关闭…"
  exit 1
fi

# 4) 灌入示例数据（如果用户没否定）
echo ""
echo "是否灌入示例数据让你立刻能看到内容？(Y/n)"
read -r SEED
if [[ "$SEED" != "n" && "$SEED" != "N" ]]; then
  npm run db:seed
  echo "✓ 示例数据已写入 data/recruit.db"
fi

echo ""
echo "=========================================="
echo "  ✓ 全部就绪"
echo "=========================================="
echo ""
echo "下一步：双击 start.command 启动应用"
echo ""
read -n 1 -s -r -p "按任意键关闭此窗口…"
