# Recruit Copilot · 2027 Summer & Fall 投递助手

一款本地优先的求职助手：把每一条 JD、每一轮面试、每一份过往经历，都沉淀为可被 AI 反复检索与重写的资产。

设计语言参考 Anthropic 自家产品 — 暖米色背景、克制的衬线大标题、单一暖色作为强调，所有面板都是"surface"而非彩色块。

---

## 1. 功能一览

```
01 概览     仪表盘：各状态数量 / 最近投递 / 即将到来的面试 / AI provider 状态
02 投递看板  按状态分栏（未投 / 已投 / OA / 面试中 / Offer / 已挂 / 已撤回）
03 解析新岗位 粘贴 URL / 文本，或上传 PDF → AI 抽取公司/岗位/行业/地点/起止日期/关键词 → 你确认后入库
04 个人资料  上传简历、项目、感悟（支持 PDF）→ AI 抽取技能/经历段落
05 面经库    自己或朋友贡献的面经 → AI 抽取高频题 → 在准备同公司面试时自动检索
06 AI 工作台 简历优化 / 面试准备的 Markdown 工件，统一归档
```

投递详情页内还包含：

- 一键切换状态（点选即 PATCH，自动写入 appliedAt）
- 面试轮次卡片：每一轮可记录 题目 / 我的答题 / 复盘 / 面试官 / 结果
- 「生成简历优化」&「生成面试准备」两个核心按钮

---

## 2. 技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind |
| 后端 | Next.js Route Handlers（同进程 Node runtime） |
| 数据 | SQLite（better-sqlite3，WAL 模式），本地文件 `./data/recruit.db` |
| AI  | 适配层：默认本地 mock；填 `ANTHROPIC_API_KEY` 即切到 Claude |
| 解析 | `pdf-parse` 抽 PDF 文本；URL 抓取走内置 `fetch` + 极简正文剥离 |

数据流：

```
Ingest 入口 ──┐
              ├─→ extractText() ─→ ai.parseJobPosting() ─→ Application 草稿
URL/PDF/Text ─┘                                            │
                                                           ▼
                                                   /api/applications  (POST)
                                                           │
                                                           ▼
                                                      SQLite (本地)
```

---

## 3. 项目结构

```
src/
  app/
    layout.tsx                      # 全局壳 + Anthropic 风格 CSS
    page.tsx                        # 概览
    applications/
      page.tsx                      # 看板（按 status 分栏）
      [id]/page.tsx, view.tsx       # 详情 + 面试轮次 + AI 工件
    ingest/page.tsx, form.tsx       # URL/文本/PDF 摄取
    profile/page.tsx, board.tsx     # 个人资料库
    experiences/page.tsx, board.tsx # 面经库
    studio/page.tsx                 # AI 工件汇总
    not-found.tsx
    api/
      applications/...              # CRUD
      interviews/...
      profile/...
      experiences/...
      ingest/route.ts               # URL/Text/PDF → JD 草稿
      ai/optimize-resume/route.ts
      ai/prepare-interview/route.ts
      artifacts/...                 # AI 工件读取/删除
      stats/route.ts                # 概览数据
      export/route.ts               # 一键导出 JSON
  components/
    app-shell.tsx                   # 左侧导航 + AI provider 状态
    ui.tsx                          # StatusPill / SectionTitle / EmptyState
    markdown.tsx                    # 极简 markdown 渲染
  lib/
    db.ts                           # SQLite 连接 + 迁移
    repo.ts                         # 数据访问层
    types.ts                        # 共享类型
    http.ts                         # JSON helper
    ai/
      types.ts                      # AiProvider 接口
      mock.ts                       # 启发式本地实现
      anthropic.ts                  # Claude SDK 实现
      index.ts                      # 选择器（按环境变量自动切换）
scripts/
  seed.mjs                          # 示例数据
  reset-db.mjs
data/
  recruit.db                        # （首次运行后自动生成）
```

---

## 4. 启动

需要 Node.js ≥ 18.18。`better-sqlite3` 会在 `pnpm/npm install` 时编译原生模块；如失败，请确保本机有 Xcode CLI / build-essential。

```bash
# 1. 安装依赖
npm install

# 2. （可选）灌入示例数据
npm run db:seed

# 3. 启动开发服务器
npm run dev
# → http://localhost:3000
```

### 接入真实 AI

复制 `.env.example` 为 `.env.local`，填入：

```ini
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-5   # 可选，默认 sonnet-4-5
```

重启 dev server。左下角导航处的 provider 指示灯会从灰色变橙色。
不填 Key 时一切照常运行——只是解析精度会差一些（基于正则/词典启发式）。

### 数据导出 / 备份

随时访问 [`/api/export`](http://localhost:3000/api/export) 下载完整 JSON 快照。
直接备份 `data/recruit.db` 也行——单文件、无锁外泄。

---

## 5. AI 适配层契约

任何 provider 都实现 `src/lib/ai/types.ts` 中的接口：

```ts
parseJobPosting(raw)          → ParsedJob              // 解析 JD
parseResume(text)             → ResumeStructured      // 解析简历
parseSharedExperience(raw)    → ParsedExperience      // 抽面经高频题
optimizeResume({ app, docs }) → string (markdown)     // 简历改写建议
prepareInterview({ app, ... })→ string (markdown)     // 面试准备
```

想接 OpenAI / 自建模型？新增一个文件实现接口，在 `ai/index.ts` 里加一个分支。

---

## 6. 路线图（建议下一步）

- 拖拽看板（Pragmatic Drag & Drop）替代当前的状态按钮
- 投递日历视图（基于 `deadline`）
- 简历版本管理：每次「生成简历优化」存为可对比的 markdown diff
- 面经查重：基于向量相似度合并同题
- Web Clipper 浏览器扩展：在公司招聘页一键发送到 `/api/ingest`

---

数据始终在你本地。出门别忘了带它。
