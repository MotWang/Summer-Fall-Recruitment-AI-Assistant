import { NextRequest } from "next/server";
import {
  createAiArtifact,
  getAiArtifact,
  getApplication,
  listProfileEntries,
} from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { evaluationToMarkdown } from "@/lib/ai/mock-video-interview";
import { ok, err, readJson } from "@/lib/http";
import type {
  MockVideoInterviewAnswer,
  MockVideoInterviewSession,
} from "@/lib/ai/types";

export const runtime = "nodejs";

interface Body {
  applicationId: string;
  sessionId?: string;
  sessionArtifactId?: string;
  session?: MockVideoInterviewSession;
  answers: MockVideoInterviewAnswer[];
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    if (!body.answers?.length) return err("answers 不能为空");

    const app = getApplication(body.applicationId);
    if (!app) return err("application not found", 404);

    let session = body.session;
    if (!session && body.sessionArtifactId) {
      const art = getAiArtifact(body.sessionArtifactId);
      if (!art || art.kind !== "mock_interview_session") return err("session artifact not found", 404);
      session = JSON.parse(art.content) as MockVideoInterviewSession;
    }
    if (!session) return err("缺少 session 或 sessionArtifactId");

    const evaluation = await getProvider().evaluateMockVideoInterview({
      application: app,
      session,
      answers: body.answers,
      profileDocs: [],
      profileEntries: listProfileEntries({ status: "active" }),
    });

    const reportMd = evaluationToMarkdown(evaluation, session);
    const artifact = createAiArtifact({
      applicationId: app.id,
      kind: "mock_interview_evaluation",
      title: `Mock 面试评估 · ${app.company} · ${evaluation.overallScore} 分`,
      inputRef: session.sessionId,
      content: reportMd,
    });

    return ok({ evaluation, reportMarkdown: reportMd, artifact });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
