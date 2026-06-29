import { NextRequest } from "next/server";
import { deleteInterview, getInterview, updateInterview } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { Interview } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const i = getInterview(params.id);
  if (!i) return err("not found", 404);
  return ok(i);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readJson<Partial<Interview>>(req);
  const updated = updateInterview(params.id, body);
  if (!updated) return err("not found", 404);
  return ok(updated);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const r = deleteInterview(params.id);
  if (!r) return err("not found", 404);
  return ok({ id: params.id, deleted: true });
}
