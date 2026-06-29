import { NextRequest } from "next/server";
import {
  deleteSharedExperience,
  getSharedExperience,
  updateSharedExperience,
} from "@/lib/repo";
import { ok, err, readJson } from "@/lib/http";
import type { SharedExperience } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: NextRequest, { params }: { params: { id: string } }) {
  const e = getSharedExperience(params.id);
  if (!e) return err("not found", 404);
  return ok(e);
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await readJson<Partial<SharedExperience>>(req);
    const updated = updateSharedExperience(params.id, body);
    return updated ? ok(updated) : err("not found", 404);
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const r = deleteSharedExperience(params.id);
  if (!r) return err("not found", 404);
  return ok({ id: params.id, deleted: true });
}
