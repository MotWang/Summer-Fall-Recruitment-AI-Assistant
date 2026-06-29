// 上传 PDF / DOCX / 纯文本 → AI 解析为模块化 ProfileEntry 列表 →
// 同时返回每条与已有条目的"重复建议"，前端做最终决策。
//
// 本接口只解析、不落库。前端确认后调用 /api/profile-entries POST 入库。

import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai";
import { ok, err } from "@/lib/http";
import { extractPdf, extractDocx } from "@/lib/extract";
import { suggestMatchForEntry } from "@/lib/repo";
import type { ParsedEntry } from "@/lib/ai/types";
import type { ProfileEntry } from "@/lib/types";

export const runtime = "nodejs";

interface Body {
  text?: string;
  pdfBase64?: string;
  docxBase64?: string;
  filename?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Body;
    let text = body.text ?? "";
    let source: ProfileEntry["source"] = "text";
    if (body.pdfBase64) {
      text = [text, await extractPdf(body.pdfBase64)].filter(Boolean).join("\n\n");
      source = "pdf";
    }
    if (body.docxBase64) {
      text = [text, await extractDocx(body.docxBase64)].filter(Boolean).join("\n\n");
      source = "docx";
    }
    if (!text.trim()) return err("没有可解析的内容");

    const provider = getProvider();
    const entries = await provider.parseResumeIntoEntries(text);

    // 给每条 entry 附上合并建议
    const suggestions = entries.map((e: ParsedEntry) => {
      const { match, similarity } = suggestMatchForEntry(e);
      return {
        entry: { ...e, source, status: "draft" as const },
        suggestion: match
          ? {
              kind: similarity > 0.85 ? ("replace_or_merge" as const) : ("possible_duplicate" as const),
              matchId: match.id,
              matchTitle: match.title,
              matchOrg: match.org,
              similarity,
            }
          : { kind: "new" as const, similarity: 0 },
      };
    });

    return ok({
      providerUsed: provider.name,
      entries: suggestions,
      rawTextLength: text.length,
      filename: body.filename ?? null,
    });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
