import { getStats } from "@/lib/repo";
import { ok } from "@/lib/http";
import { providerName } from "@/lib/ai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return ok({ ...getStats(), aiProvider: providerName() });
}
