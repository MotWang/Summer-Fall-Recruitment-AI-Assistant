import { NextRequest } from "next/server";
import { getAppSettings, setAppSettings } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { AppSettings } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function redact(s: AppSettings): AppSettings & {
  anthropicApiKeyMasked?: string | null;
  bedrockApiKeyMasked?: string | null;
  openrouterApiKeyMasked?: string | null;
} {
  const maskedAnthropic = s.anthropicApiKey
    ? `${s.anthropicApiKey.slice(0, 6)}…${s.anthropicApiKey.slice(-4)}`
    : null;
  const maskedBedrock = s.bedrockApiKey
    ? `${s.bedrockApiKey.slice(0, 6)}…${s.bedrockApiKey.slice(-4)}`
    : null;
  const maskedOpenRouter = s.openrouterApiKey
    ? `${s.openrouterApiKey.slice(0, 6)}…${s.openrouterApiKey.slice(-4)}`
    : null;
  return {
    ...s,
    anthropicApiKey: undefined,
    bedrockApiKey: undefined,
    openrouterApiKey: undefined,
    anthropicApiKeyMasked: maskedAnthropic,
    bedrockApiKeyMasked: maskedBedrock,
    openrouterApiKeyMasked: maskedOpenRouter,
  };
}

export async function GET() {
  return ok(redact(getAppSettings()));
}

export async function PUT(req: NextRequest) {
  try {
    const body = await readJson<Partial<AppSettings>>(req);
    const merged = setAppSettings(body);
    return ok(redact(merged));
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
