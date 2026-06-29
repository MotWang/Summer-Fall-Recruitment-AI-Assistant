// 小红书 MaaS / AWS Bedrock 代理 — InvokeModel with response stream
// 路径：{baseUrl}/model/{modelId}/invoke-with-response-stream
// 认证：Authorization: Bearer {MAAS_API_KEY}

import { getAppSettings } from "../repo";

export interface BedrockConfig {
  baseUrl: string;
  apiKey: string;
  modelId: string;
  region?: string;
}

export function readBedrockConfig(): BedrockConfig | null {
  let baseUrl = "";
  let apiKey = "";
  let modelId = "";
  let region = "";

  try {
    const s = getAppSettings();
    if (s.bedrockBaseUrl?.trim()) baseUrl = s.bedrockBaseUrl.trim();
    if (s.bedrockApiKey?.trim()) apiKey = s.bedrockApiKey.trim();
    if (s.bedrockModel?.trim()) modelId = s.bedrockModel.trim();
    if (s.bedrockRegion?.trim()) region = s.bedrockRegion.trim();
  } catch {
    // DB 尚未就绪时回落 env
  }

  if (!baseUrl) baseUrl = (process.env.BEDROCK_BASE_URL ?? "").trim();
  if (!apiKey) apiKey = (process.env.BEDROCK_API_KEY ?? "").trim();
  if (!modelId) modelId = (process.env.BEDROCK_MODEL ?? "").trim();
  if (!region) region = (process.env.BEDROCK_REGION ?? "ap-northeast-1").trim();

  if (!apiKey || !baseUrl || !modelId) return null;
  return { baseUrl, apiKey, modelId, region: region || undefined };
}

export function isBedrockConfigured(): boolean {
  return readBedrockConfig() !== null;
}

function decodeStreamEvent(inner: {
  type?: string;
  delta?: { type?: string; text?: string };
}): string | null {
  if (inner.type === "content_block_delta" && inner.delta?.type === "text_delta") {
    return inner.delta.text ?? "";
  }
  return null;
}

function parseInvokeStream(raw: string): string {
  const texts: string[] = [];

  // 换行分隔的 JSON 事件（部分网关）
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    try {
      const evt = JSON.parse(line) as { chunk?: { bytes?: string } };
      if (!evt.chunk?.bytes) continue;
      const inner = JSON.parse(Buffer.from(evt.chunk.bytes, "base64").toString("utf8")) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      const t = decodeStreamEvent(inner);
      if (t) texts.push(t);
    } catch {
      // skip
    }
  }
  if (texts.length) return texts.join("").trim();

  // AWS 二进制 event stream — 从 payload 中提取 base64 "bytes" 字段
  const re = /"bytes"\s*:\s*"([A-Za-z0-9+/=]+)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    try {
      const inner = JSON.parse(Buffer.from(m[1], "base64").toString("utf8")) as {
        type?: string;
        delta?: { type?: string; text?: string };
      };
      const t = decodeStreamEvent(inner);
      if (t) texts.push(t);
    } catch {
      // skip
    }
  }
  return texts.join("").trim();
}

function parseInvokeJson(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  if (Array.isArray(d.content)) {
    return (d.content as Array<{ text?: string }>)
      .map((c) => c.text ?? "")
      .join("")
      .trim();
  }
  return null;
}

/** Bedrock Anthropic Invoke — 返回 assistant 文本 */
export async function bedrockConverse(opts: {
  system?: string;
  user: string;
  maxTokens?: number;
  config?: BedrockConfig;
}): Promise<string> {
  const cfg = opts.config ?? readBedrockConfig();
  if (!cfg) throw new Error("Bedrock 未配置（请填写 Base URL / API Key / Model）");

  const base = cfg.baseUrl.replace(/\/$/, "");
  const streamUrl = `${base}/model/${encodeURIComponent(cfg.modelId)}/invoke-with-response-stream`;
  const invokeUrl = `${base}/model/${encodeURIComponent(cfg.modelId)}/invoke`;

  // model ID 已在 URL 路径中，请求体不再包含 model 字段
  const body: Record<string, unknown> = {
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: opts.maxTokens ?? 4096,
    messages: [
      {
        role: "user",
        content: [{ type: "text", text: opts.user }],
      },
    ],
  };
  if (opts.system) {
    body.system = [{ type: "text", text: opts.system }];
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.apiKey}`,
  };
  if (cfg.region) {
    headers["x-amz-bedrock-region"] = cfg.region;
  }

  // 优先尝试非流式 invoke（响应更简单）
  const invokeRes = await fetch(invokeUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (invokeRes.ok) {
    const invokeRaw = await invokeRes.text();
    try {
      const data = JSON.parse(invokeRaw) as unknown;
      const text = parseInvokeJson(data);
      if (text) return text;
    } catch {
      // fallback to stream
    }
  }

  const res = await fetch(streamUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  const raw = await res.text();
  if (!res.ok) {
    throw new Error(`Bedrock API ${res.status}: ${raw.slice(0, 300)}`);
  }

  const streamText = parseInvokeStream(raw);
  if (streamText) return streamText;

  try {
    const data = JSON.parse(raw) as unknown;
    const text = parseInvokeJson(data);
    if (text) return text;
  } catch {
    // non-json
  }

  throw new Error(`Bedrock 返回无法解析: ${raw.slice(0, 200)}`);
}
