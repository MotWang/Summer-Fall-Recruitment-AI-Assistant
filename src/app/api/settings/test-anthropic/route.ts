import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAppSettings } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import { bedrockConverse } from "@/lib/ai/bedrock-client";

export const runtime = "nodejs";

interface Body {
  apiKey?: string;
  model?: string;
  /** bedrock 模式 */
  provider?: "anthropic" | "bedrock";
  bedrockBaseUrl?: string;
  bedrockApiKey?: string;
  bedrockModel?: string;
  bedrockRegion?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await readJson<Body>(req).catch(() => ({}))) as Body;
    const s = getAppSettings();

    const useBedrock =
      body.provider === "bedrock" ||
      (!body.provider &&
        !!(
          body.bedrockApiKey?.trim() ||
          s.bedrockApiKey?.trim() ||
          process.env.BEDROCK_API_KEY?.trim()
        ));

    if (useBedrock) {
      const cfg = {
        baseUrl: (
          body.bedrockBaseUrl ??
          s.bedrockBaseUrl ??
          process.env.BEDROCK_BASE_URL ??
          ""
        ).trim(),
        apiKey: (
          body.bedrockApiKey ??
          s.bedrockApiKey ??
          process.env.BEDROCK_API_KEY ??
          ""
        ).trim(),
        modelId: (
          body.bedrockModel ??
          s.bedrockModel ??
          process.env.BEDROCK_MODEL ??
          ""
        ).trim(),
        region: (
          body.bedrockRegion ??
          s.bedrockRegion ??
          process.env.BEDROCK_REGION ??
          ""
        ).trim() || undefined,
      };
      if (!cfg.apiKey || !cfg.baseUrl || !cfg.modelId) {
        return err("Bedrock 配置不完整（需要 Base URL、API Key、Model）");
      }
      const out = await bedrockConverse({
        user: "Reply with the word: pong",
        maxTokens: 32,
        config: cfg,
      });
      return ok({ provider: "bedrock", model: cfg.modelId, output: out });
    }

    const key = (body.apiKey ?? s.anthropicApiKey ?? process.env.ANTHROPIC_API_KEY ?? "").trim();
    const model = (body.model ?? s.anthropicModel ?? "claude-sonnet-4-5").trim();
    if (!key) return err("没有 API Key 可以测试");
    const c = new Anthropic({ apiKey: key });
    const resp = await c.messages.create({
      model,
      max_tokens: 32,
      messages: [{ role: "user", content: "Reply with the word: pong" }],
    });
    const out = resp.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
    return ok({ provider: "anthropic", model, output: out });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
