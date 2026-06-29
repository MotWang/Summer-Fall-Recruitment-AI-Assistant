import { NextRequest } from "next/server";
import { createProfileDoc, listProfileDocs } from "@/lib/repo";
import { getProvider } from "@/lib/ai";
import { ok, err, readJson } from "@/lib/http";
import type { ProfileDoc } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  return ok(listProfileDocs());
}

interface CreateBody {
  title: string;
  kind: ProfileDoc["kind"];
  content: string;
  /** 是否要求 AI 立即解析结构化字段 */
  parse?: boolean;
}

export async function POST(req: NextRequest) {
  try {
    const body = await readJson<CreateBody>(req);
    if (!body.title || !body.content) return err("title 与 content 必填");
    let structured: ProfileDoc["structured"] | undefined;
    if (body.parse !== false) {
      const provider = getProvider();
      structured = await provider.parseResume(body.content);
    }
    const created = createProfileDoc({
      title: body.title,
      kind: body.kind ?? "experience",
      content: body.content,
      structured,
    });
    return ok(created, { status: 201 });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
