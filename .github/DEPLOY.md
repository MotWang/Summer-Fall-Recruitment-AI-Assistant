# GitHub 部署与一键运行

## 密钥安全

以下内容**不会**进入 Git 仓库（已在 `.gitignore` 中排除）：

- `.env.local`、`.env`
- `data/recruit.db`（含你在设置页保存的 API Key）

在 GitHub 上配置密钥请使用：

**Settings → Secrets and variables → Codespaces**（推荐）

| Secret 名称 | 说明 |
|-------------|------|
| `ANTHROPIC_API_KEY` | Anthropic 官方 API Key（可选） |
| `BEDROCK_BASE_URL` | 兼容网关 Base URL（可选） |
| `BEDROCK_API_KEY` | 兼容网关 API Key（可选） |
| `BEDROCK_MODEL` | 模型 ID，如 `global.anthropic.claude-sonnet-4-6` |
| `BEDROCK_REGION` | AWS Region，如 `ap-northeast-1` |
| `OPENROUTER_API_KEY` | OpenRouter API Key（可选） |
| `OPENROUTER_MODEL` | OpenRouter 模型，如 `anthropic/claude-sonnet-4` |

## 在 GitHub 云端运行

### 方式一：GitHub Codespaces（推荐 · 一键运行）

1. 打开仓库 README，点击 **Open in GitHub Codespaces** 徽章  
   或：**Code** → **Codespaces** → **Create codespace on main**
2. 首次创建约 2–3 分钟；`.devcontainer` 会自动 `npm install` 并启动 `npm run dev`
3. 浏览器会转发端口 **3055**；也可在底部 **Ports** 面板手动打开

不配置 Secrets 时应用仍可完整运行，AI 功能使用本地 Mock。

### 方式二：GitHub Actions CI

每次 push 会在 GitHub 托管的 `ubuntu-latest` 上自动执行 lint、类型检查与 build（见 `.github/workflows/ci.yml`）。CI 不注入真实 API Key。

### 关于公网长期托管

GitHub **不提供**长期托管 Next.js 应用的服务器。若需要公网 URL，请将本仓库连接到 [Vercel](https://vercel.com) 或 [Railway](https://railway.app)，并在对应平台的环境变量中配置 AI 相关变量。注意 SQLite 本地库在 Serverless 环境需额外方案（如 Turso）。
