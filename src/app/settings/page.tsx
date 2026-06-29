import path from "node:path";
import { getAppSettings } from "@/lib/repo";
import { providerName, providerDisplayName, resolveActiveProviderId } from "@/lib/ai";
import { SectionTitle } from "@/components/ui";
import { SettingsForm } from "./form";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const settings = getAppSettings();
  const maskedAnthropic = settings.anthropicApiKey
    ? `${settings.anthropicApiKey.slice(0, 6)}…${settings.anthropicApiKey.slice(-4)}`
    : null;
  const maskedBedrock = settings.bedrockApiKey
    ? `${settings.bedrockApiKey.slice(0, 6)}…${settings.bedrockApiKey.slice(-4)}`
    : null;
  const maskedOpenRouter = settings.openrouterApiKey
    ? `${settings.openrouterApiKey.slice(0, 6)}…${settings.openrouterApiKey.slice(-4)}`
    : null;
  const dbPath = process.env.RECRUIT_DB_PATH || path.join(process.cwd(), "data", "recruit.db");
  const activeId = resolveActiveProviderId();

  return (
    <div>
      <SectionTitle
        eyebrow="设置"
        title="设置"
        subtitle="API 接入、外观、数据管理 — 全部本地存储，不会上传。"
      />
      <SettingsForm
        initialSettings={{
          aiProvider: settings.aiProvider ?? activeId,
          anthropicApiKeyMasked: maskedAnthropic,
          anthropicModel: settings.anthropicModel ?? "claude-sonnet-4-5",
          bedrockApiKeyMasked: maskedBedrock,
          bedrockBaseUrl: settings.bedrockBaseUrl ?? process.env.BEDROCK_BASE_URL ?? "",
          bedrockModel:
            settings.bedrockModel ?? process.env.BEDROCK_MODEL ?? "global.anthropic.claude-sonnet-4-6",
          bedrockRegion: settings.bedrockRegion ?? process.env.BEDROCK_REGION ?? "ap-northeast-1",
          openrouterApiKeyMasked: maskedOpenRouter,
          openrouterModel:
            settings.openrouterModel ?? process.env.OPENROUTER_MODEL ?? "anthropic/claude-sonnet-4",
          openrouterBaseUrl:
            settings.openrouterBaseUrl ?? process.env.OPENROUTER_BASE_URL ?? "https://openrouter.ai/api/v1",
          theme: settings.theme ?? "light",
          accent: settings.accent ?? "clay",
        }}
        activeProvider={providerName()}
        activeProviderLabel={providerDisplayName(activeId)}
        dbPath={dbPath}
      />
    </div>
  );
}
