import { mockProvider } from "./mock";
import { resolveActiveProviderId } from "./provider-routing";
import type { AiProvider } from "./types";
import type { AiProviderId } from "../types";

/**
 * 每次按需选择 provider（不缓存）：
 * 由设置页 aiProvider + 对应凭证决定；未配置则 mock。
 */
export function getProvider(): AiProvider {
  if (resolveActiveProviderId() === "mock") {
    return mockProvider;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./anthropic") as typeof import("./anthropic");
    return mod.anthropicProvider;
  } catch (e) {
    console.warn("[ai] failed to load provider, fallback to mock:", e);
    return mockProvider;
  }
}

export function providerName(): AiProviderId {
  return getProvider().name;
}

export { providerDisplayName, resolveActiveProviderId, isProviderConfigured } from "./provider-routing";
