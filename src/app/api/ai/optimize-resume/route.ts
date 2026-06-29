import { NextRequest } from "next/server";
import {
  createAiArtifact,
  getApplication,
  listProfileEntries,
} from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";

export const runtime = "nodejs";

interface Body {
  applicationId: string;
  variant?: "cn" | "en" | "both";
}

function splitResumeSections(md: string): { cn: string; en: string } {
  const cnIdx = md.indexOf("## A.");
  const enIdx = md.indexOf("## B.");
  if (cnIdx === -1 || enIdx === -1) {
    return {
      cn: `# 中文版简历优化\n\n${md}`,
      en: `# English Resume Optimization\n\n${md}`,
    };
  }
  const cn = md.slice(cnIdx, enIdx).trim();
  const en = md.slice(enIdx).trim();
  return { cn: `# 中文版简历优化\n\n${cn}`, en: `# English Resume Optimization\n\n${en}` };
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<Body>(req);
    const app = getApplication(body.applicationId);
    if (!app) return err("application not found", 404);
    const entries = listProfileEntries({ status: "active" });
    const variant = body.variant ?? "both";
    const md = await getProvider().optimizeResume({
      application: app,
      profileDocs: [],
      profileEntries: entries,
    });
    const sections = splitResumeSections(md);
    const artifacts = [];
    if (variant === "cn" || variant === "both") {
      artifacts.push(
        createAiArtifact({
          applicationId: app.id,
          kind: "resume_tailor",
          title: `简历优化（中文）· ${app.company} · ${app.role}`,
          inputRef: "resume:cn",
          content: sections.cn,
        }),
      );
    }
    if (variant === "en" || variant === "both") {
      artifacts.push(
        createAiArtifact({
          applicationId: app.id,
          kind: "resume_tailor",
          title: `Resume Tailor (EN) · ${app.company} · ${app.role}`,
          inputRef: "resume:en",
          content: sections.en,
        }),
      );
    }
    return ok({ artifacts });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
