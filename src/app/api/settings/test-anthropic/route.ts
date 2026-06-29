import { NextRequest } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getAppSettings } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import { bedrockConverse } from "@/lib/ai/bedrock-client";
import { openrouterChat } from "@/lib/ai/openrouter-client";
import type { AiProviderId } from "@/lib/types";

export const runtime = "nodejs";

interface Body {
  provider: AiProviderId;
  apiKey?: string;
  model?: string;
  bedrockBaseUrl?: string;
  bedrockApiKey?: string;
  bedrockModel?: string;
  bedrockRegion?: string;
  openrouterApiKey?: string;
  openrouterModel?: string;
  openrouterBaseUrl?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await readJson<Body>(req).catch(() => ({}))) as Body;
    const s = getAppSettings();
    const provider = body.provider;

    if (provider === "mock") {
      return ok({ provider: "mock", model: "local", output: "pong (mock)" });
    }

    if (provider === "gateway") {
      const cfg = {
        baseUrl: (body.bedrockBaseUrl ?? s.bedrockBaseUrl ?? process.env.BEDROCK_BASE_URL ?? "").trim(),
        apiKey: (body.bedrockApiKey ?? s.bedrockApiKey ?? process.env.BEDROCK_API_KEY ?? "").trim(),
        modelId: (body.bedrockModel ?? s.bedrockModel ?? process.env.BEDROCK_MODEL ?? "").trim(),
        region:
          (body.bedrockRegion ?? s.bedrockRegion ?? process.env.BEDROCK_REGION ?? "").trim() || undefined,
      };
      if (!cfg.apiKey || !cfg.baseUrl || !cfg.modelId) {
        return err("兼容网关配置不完整（需要 Base URL、API Key、模型 ID）");
      }
      const out = await bedrockConverse({
        user: "Reply with the word: pong",
        maxTokens: 32,
        config: cfg,
      });
      return ok({ provider: "gateway", model: cfg.modelId, output: out });
    }

    if (provider === "openrouter") {
      const cfg = {
        baseUrl: (
          body.openrouterBaseUrl ??
          s.openrouterBaseUrl ??
          process.env.OPENROUTER_BASE_URL ??
          "https://openrouter.ai/api/v1"
        )
          .trim()
          .replace(/\/$/, ""),
        apiKey: (body.openrouterApiKey ?? s.openrouterApiKey ?? process.env.OPENROUTER_API_KEY ?? "").trim(),
        model: (
          body.openrouterModel ??
          s.openrouterModel ??
          process.env.OPENROUTER_MODEL ??
          "anthropic/claude-sonnet-4"
        ).trim(),
      };
      if (!cfg.apiKey || !cfg.model) {
        return err("OpenRouter 配置不完整（需要 API Key 与模型）");
      }
      const out = await openrouterChat({
        system: "Reply briefly.",
        user: "Reply with the word: pong",
        maxTokens: 32,
        config: cfg,
      });
      return ok({ provider: "openrouter", model: cfg.model, output: out });
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
