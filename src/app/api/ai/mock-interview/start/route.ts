import { NextRequest } from "next/server";
import {
  createAiArtifact,
  getApplication,
  listProfileEntries,
  listSharedExperiences,
} from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";
import type { InterviewKind } from "@/lib/types";

export const runtime = "nodejs";

interface Body {
  applicationId: string;
  round?: number;
  kind?: InterviewKind;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    const app = getApplication(body.applicationId);
    if (!app) return err("application not found", 404);

    const session = await getProvider().startMockVideoInterview({
      application: app,
      profileDocs: [],
      profileEntries: listProfileEntries({ status: "active" }),
      sharedExperiences: listSharedExperiences({ company: app.company }),
      round: body.round ?? 1,
      interviewKind: body.kind ?? "technical",
    });

    const artifact = createAiArtifact({
      applicationId: app.id,
      kind: "mock_interview_session",
      title: `Mock 视频面试 · ${app.company} · 第 ${session.round} 轮`,
      inputRef: session.sessionId,
      content: JSON.stringify(session, null, 2),
    });

    return ok({ session, artifact });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
