#!/usr/bin/env bash
# 一键推送到 GitHub（需先在 github.com 创建空仓库）
set -euo pipefail

REPO_NAME="${1:-recruit-copilot-2027}"
GITHUB_USER="${2:-wangqifeng1}"

cd "$(dirname "$0")/.."

if git remote get-url origin >/dev/null 2>&1; then
  echo "已有 remote origin，直接 push…"
else
  echo "添加 remote: git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
  git remote add origin "git@github.com:${GITHUB_USER}/${REPO_NAME}.git"
fi

echo "推送 main 分支…"
git push -u origin main

echo ""
echo "完成。请在 GitHub 仓库 Settings → Secrets 中配置 BEDROCK_API_KEY 等变量。"
echo "云端运行：Code → Codespaces → Create codespace"
