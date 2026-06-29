import { NextRequest } from "next/server";
import {
  createAiArtifact,
  getApplication,
  listProfileDocs,
  listSharedExperiences,
} from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";

export const runtime = "nodejs";

interface Body {
  applicationId: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    const app = getApplication(body.applicationId);
    if (!app) return err("application not found", 404);
    const docs = listProfileDocs();
    const exps = listSharedExperiences({ company: app.company });
    const md = await getProvider().prepareInterview({
      application: app,
      profileDocs: docs,
      sharedExperiences: exps,
    });
    const artifact = createAiArtifact({
      applicationId: app.id,
      kind: "interview_prep",
      title: `面试准备 · ${app.company} · ${app.role}`,
      content: md,
    });
    return ok(artifact);
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
