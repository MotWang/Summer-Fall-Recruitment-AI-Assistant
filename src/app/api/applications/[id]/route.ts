import { NextRequest } from "next/server";
import {
  deleteApplication,
  getApplication,
  listInterviews,
  updateApplication,
} from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { Application } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const app = getApplication(params.id);
  if (!app) return err("not found", 404);
  return ok({ ...app, interviews: listInterviews(app.id) });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readJson<Partial<Application>>(req);
  const updated = updateApplication(params.id, body);
  if (!updated) return err("not found", 404);
  return ok(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const r = deleteApplication(params.id);
  if (!r) return err("not found", 404);
  return ok({ id: params.id, deleted: true });
}
