import { mockProvider } from "./mock";
import { getAppSettings } from "../repo";
import { isBedrockConfigured } from "./bedrock-client";
import type { AiProvider } from "./types";

/**
 * 每次按需选择 provider（不缓存）：
 *  - 优先 Bedrock（DB 设置或 env BEDROCK_*）
 *  - 否则 Anthropic（DB 设置或 env ANTHROPIC_API_KEY）
 *  - 都没有就 mock
 *
 * 不缓存是关键：设置页改 key 必须即时生效。
 */
export function getProvider(): AiProvider {
  let hasKey = isBedrockConfigured();
  if (!hasKey) {
    try {
      const s = getAppSettings();
      if (s.anthropicApiKey && s.anthropicApiKey.trim()) hasKey = true;
    } catch {
      // ignore
    }
  }
  if (!hasKey && process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim()) {
    hasKey = true;
  }
  if (hasKey) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require("./anthropic") as typeof import("./anthropic");
      return mod.anthropicProvider;
    } catch (e) {
      console.warn("[ai] failed to load anthropic provider, fallback to mock:", e);
    }
  }
  return mockProvider;
}

export function providerName(): "anthropic" | "bedrock" | "mock" {
  return getProvider().name;
}
