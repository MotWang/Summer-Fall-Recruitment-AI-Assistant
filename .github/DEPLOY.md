# GitHub 部署说明

## 密钥安全

以下内容**不会**进入 Git 仓库（已在 `.gitignore` 中排除）：

- `.env.local`、`.env`
- `data/recruit.db`（含你在设置页保存的 API Key）

在 GitHub 上配置密钥请使用：

**Settings → Secrets and variables → Actions**（或 **Codespaces**）

| Secret 名称 | 说明 |
|-------------|------|
| `BEDROCK_BASE_URL` | `https://maas.devops.rednote.life/cowork/` |
| `BEDROCK_API_KEY` | 你的 MAAS API Key |
| `BEDROCK_MODEL` | `global.anthropic.claude-opus-4-7` |
| `BEDROCK_REGION` | `ap-northeast-1` |

## 在 GitHub 云端运行

### 方式一：GitHub Codespaces（推荐）

1. 打开仓库 → **Code** → **Codespaces** → **Create codespace**
2. 在 **Settings → Secrets and variables → Codespaces** 中填入上方 Secrets
3. Codespace 启动后终端执行 `npm run dev`，端口 3000 会自动转发

不配置 Secrets 时应用仍可运行，AI 功能使用本地 mock。

### 方式二：GitHub Actions CI

每次 push 会在 GitHub 托管的 `ubuntu-latest` 上自动执行 lint、类型检查与 build（见 `.github/workflows/ci.yml`）。CI 不注入真实 API Key。

### 关于公网访问

GitHub **不提供**长期托管 Next.js 应用的服务器。若需要公网 URL，请将本仓库连接到 [Vercel](https://vercel.com) 或 [Railway](https://railway.app)，并在对应平台的环境变量中配置 `BEDROCK_*`。
