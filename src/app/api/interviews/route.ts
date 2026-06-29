import { NextRequest } from "next/server";
import { createInterview, listInterviews } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { Interview } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const appId = searchParams.get("applicationId") ?? undefined;
  return ok(listInterviews(appId));
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Partial<Interview>>(req);
    if (!body.applicationId) return err("applicationId 必填");
    const created = createInterview({ ...body, applicationId: body.applicationId });
    return ok(created, { status: 201 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
