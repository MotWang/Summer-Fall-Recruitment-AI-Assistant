import { getAppSettings } from "../repo";

export interface OpenRouterConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

export function readOpenRouterConfig(): OpenRouterConfig | null {
  let baseUrl = "https://openrouter.ai/api/v1";
  let apiKey = "";
  let model = "";

  try {
    const s = getAppSettings();
    if (s.openrouterBaseUrl?.trim()) baseUrl = s.openrouterBaseUrl.trim().replace(/\/$/, "");
    if (s.openrouterApiKey?.trim()) apiKey = s.openrouterApiKey.trim();
    if (s.openrouterModel?.trim()) model = s.openrouterModel.trim();
  } catch {
    /* env fallback */
  }

  if (!apiKey) apiKey = (process.env.OPENROUTER_API_KEY ?? "").trim();
  if (!model) model = (process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4").trim();
  if (process.env.OPENROUTER_BASE_URL?.trim()) {
    baseUrl = process.env.OPENROUTER_BASE_URL.trim().replace(/\/$/, "");
  }

  if (!apiKey || !model) return null;
  return { baseUrl, apiKey, model };
}

export async function openrouterChat(opts: {
  system: string;
  user: string;
  maxTokens?: number;
  config?: OpenRouterConfig;
}): Promise<string> {
  const cfg = opts.config ?? readOpenRouterConfig();
  if (!cfg) throw new Error("OpenRouter 未配置（请填写 API Key 与模型）");

  const res = await fetch(`${cfg.baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${cfg.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model,
      max_tokens: opts.maxTokens ?? 4096,
      messages: [
        { role: "system", content: opts.system },
        { role: "user", content: opts.user },
      ],
    }),
  });

  const raw = await res.text();
  if (!res.ok) throw new Error(`OpenRouter API ${res.status}: ${raw.slice(0, 300)}`);

  try {
    const data = JSON.parse(raw) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    if (text) return text;
  } catch {
    /* fall through */
  }
  throw new Error(`OpenRouter 返回无法解析: ${raw.slice(0, 200)}`);
}
