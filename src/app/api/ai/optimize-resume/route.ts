import { NextRequest } from "next/server";
import { createAiArtifact, getApplication, listProfileDocs } from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";

export const runtime = "nodejs";

interface Body {
  applicationId: string;
  profileIds?: string[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    const app = getApplication(body.applicationId);
    if (!app) return err("application not found", 404);
    const allDocs = listProfileDocs();
    const docs = body.profileIds ? allDocs.filter((d) => body.profileIds!.includes(d.id)) : allDocs;
    const md = await getProvider().optimizeResume({ application: app, profileDocs: docs });
    const artifact = createAiArtifact({
      applicationId: app.id,
      kind: "resume_tailor",
      title: `简历优化 · ${app.company} · ${app.role}`,
      content: md,
    });
    return ok(artifact);
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
