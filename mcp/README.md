# Recruit Copilot MCP 接入指南

供 **OpenClaw**、Claude Desktop、Cursor 等 MCP 客户端调用。

---

## 方式一：HTTP REST（云部署 / 推荐）

适合已部署到服务器的实例（如 `http://你的IP:3055`）。**每个用户**在「设置」页生成自己的 MCP API Key，数据按账号隔离。

### 1. 生成 Key

登录 → **设置** → **生成 MCP Key** → 复制 `mcp_xxx…`

### 2. 调用示例

```bash
curl -X POST https://你的域名/api/mcp \
  -H "Authorization: Bearer mcp_你的Key" \
  -H "Content-Type: application/json" \
  -d '{"action":"ingest_and_save","payload":{"text":"JD 正文..."}}'
```

### 3. OpenClaw 配置（HTTP）

在 OpenClaw 的 MCP 配置中加入自定义 HTTP 工具，或使用 REST 包装。基础信息：

| 项 | 值 |
|---|---|
| Endpoint | `POST /api/mcp` |
| 认证 | `Authorization: Bearer <MCP Key>` |
| Body | `{"action":"<动作>","payload":{...}}` |

### 4. 可用 action

| action | 说明 |
|--------|------|
| `ingest_preview` | 解析 JD，不写入 |
| `ingest_and_save` | 解析并写入看板 |
| `list_applications` | 列出投递 |
| `get_application` | 单条详情（含面试） |
| `create_application` | 手动创建 |
| `update_application` | 更新 |
| `list_interviews` / `create_interview` / `get_interview` | 面试 |
| `calendar_events` | 日历事件 |
| `google_calendar_status` / `google_calendar_sync` / `google_calendar_list` | Google 日历 |
| `capabilities` | 列出所有 action |

### 5. ingest 示例

```json
{
  "action": "ingest_and_save",
  "payload": {
    "text": "公司：Acme\n岗位：SWE Intern\n...",
    "url": "https://jobs.lever.co/...",
    "pdfBase64": "..."
  }
}
```

`payload` 四选一或组合：`url`、`text`、`pdfBase64`、`docxBase64`。

---

## 方式二：stdio MCP（本地开发）

直接读写本机 SQLite，适合在 Mac 上本地跑项目时使用。

```json
{
  "mcpServers": {
    "recruit-copilot": {
      "command": "npx",
      "args": ["tsx", "mcp-server/index.ts"],
      "cwd": "/绝对路径/2027 Summer&Fall Recruitment Assistant",
      "env": {
        "RECRUIT_DB_PATH": "/绝对路径/data/recruit.db"
      }
    }
  }
}
```

启动：`npm run mcp`

---

## 主要 Tools（stdio 模式）

- `ingest_and_save_job` — 解析并写入看板
- `ingest_job_preview` — 仅解析
- `list_applications` / `get_application`
- `create_application` / `update_application`
- `create_interview` / `list_interviews` / `get_interview`
- `get_calendar_events`
- `google_calendar_sync` / `google_calendar_list`

---

## 常见问题

**Q: HTTP 返回 401？**  
检查 MCP Key 是否正确，且使用 `Authorization: Bearer mcp_xxx` 或请求头 `x-mcp-api-key`。

**Q: 云端 URL 解析失败？**  
部分招聘站拦截服务器抓取，请在 `payload.text` 中直接传 JD 正文。

**Q: 多用户数据会混吗？**  
不会。HTTP 模式按 Key 绑定用户；stdio 模式使用本机数据库文件。
