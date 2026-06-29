import type { AiProviderId } from "./types";

export interface ProviderOption {
  id: AiProviderId;
  label: string;
  hint: string;
}

export const AI_PROVIDER_OPTIONS: ProviderOption[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    hint: "官方 Claude API",
  },
  {
    id: "gateway",
    label: "兼容网关",
    hint: "Bedrock / MaaS / 企业代理",
  },
  {
    id: "openrouter",
    label: "OpenRouter",
    hint: "多模型聚合平台",
  },
  {
    id: "mock",
    label: "本地 Mock",
    hint: "不调用外部 API",
  },
];

export const ANTHROPIC_MODELS = [
  { id: "claude-opus-4-8", label: "Opus 4.8" },
  { id: "claude-sonnet-4-6", label: "Sonnet 4.6（推荐）" },
  { id: "claude-sonnet-4-5", label: "Sonnet 4.5" },
  { id: "claude-haiku-4-5-20251001", label: "Haiku 4.5" },
];

export const GATEWAY_MODELS = [
  { id: "global.anthropic.claude-opus-4-7", label: "Claude Opus 4.7" },
  { id: "global.anthropic.claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
  { id: "global.anthropic.claude-haiku-4-5", label: "Claude Haiku 4.5" },
];

export const OPENROUTER_MODELS = [
  { id: "anthropic/claude-sonnet-4", label: "Claude Sonnet 4" },
  { id: "anthropic/claude-3.5-sonnet", label: "Claude 3.5 Sonnet" },
  { id: "openai/gpt-4o", label: "GPT-4o" },
  { id: "google/gemini-2.0-flash-001", label: "Gemini 2.0 Flash" },
];

export type GatewayPresetId = "custom" | "aws-bedrock" | "enterprise-maas";

export const GATEWAY_PRESETS: Array<{
  id: GatewayPresetId;
  label: string;
  baseUrl: string;
  region: string;
  model: string;
}> = [
  {
    id: "custom",
    label: "自定义",
    baseUrl: "",
    region: "ap-northeast-1",
    model: "global.anthropic.claude-sonnet-4-6",
  },
  {
    id: "aws-bedrock",
    label: "AWS Bedrock",
    baseUrl: "",
    region: "us-east-1",
    model: "global.anthropic.claude-sonnet-4-6",
  },
  {
    id: "enterprise-maas",
    label: "企业 MaaS",
    baseUrl: "",
    region: "ap-northeast-1",
    model: "global.anthropic.claude-sonnet-4-6",
  },
];
