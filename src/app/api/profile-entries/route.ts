import { NextRequest } from "next/server";
import { createProfileEntry, listProfileEntries } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { ProfileEntry, ProfileModule } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const profileModule = searchParams.get("module") as ProfileModule | null;
  const status = searchParams.get("status") as ProfileEntry["status"] | null;
  return ok(listProfileEntries({ module: profileModule ?? undefined, status: status ?? undefined }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Partial<ProfileEntry>>(req);
    if (!body.module || !body.title) return err("module 与 title 必填");
    const created = createProfileEntry({
      module: body.module,
      title: body.title,
      org: body.org ?? null,
      role: body.role ?? null,
      startDate: body.startDate ?? null,
      endDate: body.endDate ?? null,
      location: body.location ?? null,
      summary: body.summary ?? null,
      bullets: body.bullets ?? [],
      tags: body.tags ?? [],
      links: body.links ?? [],
      source: body.source ?? "manual",
      sourceDocId: body.sourceDocId ?? null,
      status: body.status ?? "active",
    });
    return ok(created, { status: 201 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
