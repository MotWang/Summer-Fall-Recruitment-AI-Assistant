import { NextRequest } from "next/server";
import { deleteAiArtifact } from "@/lib/repo";
import { ok, err } from "@/lib/http";

export const runtime = "nodejs";

export async function DELETE(_: NextRequest, { params }: { params: { id: string } }) {
  const r = deleteAiArtifact(params.id);
  if (!r) return err("not found", 404);
  return ok({ id: params.id, deleted: true });
}
