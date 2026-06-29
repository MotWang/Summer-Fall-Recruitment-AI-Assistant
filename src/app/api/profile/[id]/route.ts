import { NextRequest } from "next/server";
import { deleteProfileDoc, getProfileDoc, updateProfileDoc } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { ProfileDoc } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const d = getProfileDoc(params.id);
  if (!d) return err("not found", 404);
  return ok(d);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await readJson<Partial<ProfileDoc>>(req);
  const u = updateProfileDoc(params.id, body);
  if (!u) return err("not found", 404);
  return ok(u);
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const r = deleteProfileDoc(params.id);
  if (!r) return err("not found", 404);
  return ok({ id: params.id, deleted: true });
}
