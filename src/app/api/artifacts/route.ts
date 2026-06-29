import { NextRequest } from "next/server";
import { listAiArtifacts } from "@/lib/repo";
import { ok } from "@/lib/http";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appId = searchParams.get("applicationId") ?? undefined;
  return ok(listAiArtifacts(appId));
}
