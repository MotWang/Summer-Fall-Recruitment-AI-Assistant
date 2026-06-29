import { getAppSettings } from "../repo";
import { isBedrockConfigured } from "./bedrock-client";
import type { AiProviderId } from "./types";

function hasAnthropicKey(): boolean {
  try {
    const s = getAppSettings();
    if (s.anthropicApiKey?.trim()) return true;
  } catch {
    /* DB not ready */
  }
  return Boolean(process.env.ANTHROPIC_API_KEY?.trim());
}

function hasOpenRouterKey(): boolean {
  try {
    const s = getAppSettings();
    if (s.openrouterApiKey?.trim() && s.openrouterModel?.trim()) return true;
  } catch {
    /* DB not ready */
  }
  return Boolean(process.env.OPENROUTER_API_KEY?.trim());
}

/** 用户是否已为某接入方式填好必要字段（含 env 回落） */
export function isProviderConfigured(id: AiProviderId): boolean {
  switch (id) {
    case "mock":
      return true;
    case "anthropic":
      return hasAnthropicKey();
    case "gateway":
      return isBedrockConfigured();
    case "openrouter":
      return hasOpenRouterKey();
    default:
      return false;
  }
}

/**
 * 解析当前应使用的 AI 接入方式：
 * 1. 设置页显式选择的 aiProvider（mock 优先）
 * 2. 未选择时：gateway → anthropic → openrouter → mock
 */
export function resolveActiveProviderId(): AiProviderId {
  let pref: AiProviderId | undefined;
  try {
    const s = getAppSettings();
    pref = s.aiProvider;
    if (pref === "mock") return "mock";
    if (pref && isProviderConfigured(pref)) return pref;
  } catch {
    /* ignore */
  }

  if (!pref) {
    if (isBedrockConfigured()) return "gateway";
    if (hasAnthropicKey()) return "anthropic";
    if (hasOpenRouterKey()) return "openrouter";
  }

  return "mock";
}

const LABELS: Record<AiProviderId, string> = {
  anthropic: "Anthropic",
  gateway: "兼容网关",
  openrouter: "OpenRouter",
  mock: "本地 Mock",
};

export function providerDisplayName(id: AiProviderId = resolveActiveProviderId()): string {
  return LABELS[id];
}
