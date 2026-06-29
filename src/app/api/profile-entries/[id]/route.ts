import { NextRequest } from "next/server";
import { deleteProfileEntry, getProfileEntry, updateProfileEntry } from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { ProfileEntry } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const r = getProfileEntry(params.id);
  return r ? ok(r) : err("not found", 404);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await readJson<Partial<ProfileEntry>>(req);
    const updated = updateProfileEntry(params.id, body);
    return updated ? ok(updated) : err("not found", 404);
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const okIt = deleteProfileEntry(params.id);
  return okIt ? ok({ deleted: true }) : err("not found", 404);
}
