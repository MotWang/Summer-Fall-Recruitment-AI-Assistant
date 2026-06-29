#!/usr/bin/env bash
# 创建 GitHub 仓库并推送（需先完成 gh auth login）
set -euo pipefail

GH="${GH_BIN:-/tmp/gh-cli/gh_2.67.0_macOS_arm64/bin/gh}"
REPO_NAME="${1:-recruit-copilot-2027}"
VISIBILITY="${2:-private}"  # private | public

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! "$GH" auth status >/dev/null 2>&1; then
  echo "尚未登录 GitHub CLI。正在启动浏览器授权…"
  echo "请在打开的页面输入一次性验证码。"
  "$GH" auth login --hostname github.com --git-protocol https --web
fi

USER="$("$GH" api user -q .login)"
echo "GitHub 用户: $USER"

if "$GH" repo view "$USER/$REPO_NAME" >/dev/null 2>&1; then
  echo "仓库已存在: https://github.com/$USER/$REPO_NAME"
else
  echo "创建仓库 $REPO_NAME ($VISIBILITY)…"
  "$GH" repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --description "2027 Summer & Fall Recruitment Assistant"
fi

git remote remove origin 2>/dev/null || true
git remote add origin "https://github.com/$USER/$REPO_NAME.git"

echo "推送 main…"
git push -u origin main

echo ""
echo "✓ 完成: https://github.com/$USER/$REPO_NAME"
echo "密钥未上传。云端 AI 请在 GitHub → Settings → Secrets 配置 BEDROCK_API_KEY 等。"
