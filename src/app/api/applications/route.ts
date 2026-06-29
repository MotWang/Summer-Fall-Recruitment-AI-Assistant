import { NextRequest } from "next/server";
import { createApplication, listApplications } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { Application } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status") as Application["status"] | null;
  const search = searchParams.get("q") ?? undefined;
  return ok(listApplications({ status: status ?? undefined, search }));
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Partial<Application>>(req);
    if (!body.company || !body.role) return err("company 与 role 必填");
    const created = createApplication({ ...body, company: body.company, role: body.role });
    return ok(created, { status: 201 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
