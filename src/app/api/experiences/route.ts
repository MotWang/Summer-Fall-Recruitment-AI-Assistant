import { NextRequest } from "next/server";
import { createSharedExperience, listSharedExperiences } from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";
import type { SharedExperience } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const company = searchParams.get("company") ?? undefined;
  return ok(listSharedExperiences({ company }));
}

interface Body {
  rawContent: string;
  company?: string;
  role?: string;
  contributor?: string;
  stage?: string;
  source?: string;
  applicationId?: string;
  parse?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    if (!body.rawContent) return err("rawContent 必填");
    let parsed: Awaited<ReturnType<ReturnType<typeof getProvider>["parseSharedExperience"]>> | null = null;
    if (body.parse !== false) {
      parsed = await getProvider().parseSharedExperience(body.rawContent, { company: body.company });
    }
    const created = createSharedExperience({
      company: body.company ?? parsed?.company ?? "未识别公司",
      role: body.role ?? parsed?.role ?? null,
      stage: body.stage ?? parsed?.stage ?? null,
      source: body.source ?? null,
      contributor: body.contributor ?? null,
      applicationId: body.applicationId ?? null,
      season: null,
      content: parsed?.cleanedContent ?? body.rawContent,
      highlights: parsed?.highlights ?? [],
    } satisfies Omit<SharedExperience, "id" | "createdAt" | "updatedAt">);
    return ok(created, { status: 201 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
