// 接受 URL / 文本 / PDF / DOCX → 抽文本 → 调 AI 解析 → 返回 Application 草稿（不落库）

import { NextRequest } from "next/server";
import { getProvider } from "@/lib/ai";
import { ok, err } from "@/lib/http";
import { extractPdf, extractDocx, fetchUrlText } from "@/lib/extract";
import type { Application } from "@/lib/types";

export const runtime = "nodejs";

interface IngestBody {
  url?: string;
  text?: string;
  pdfBase64?: string;
  docxBase64?: string;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as IngestBody;
    let text = body.text ?? "";
    if (body.url && !text) {
      try {
        text = await fetchUrlText(body.url);
      } catch (e) {
        return err(`抓取 URL 失败：${(e as Error).message}`);
      }
    }
    if (body.pdfBase64) {
      try {
        text = [text, (await extractPdf(body.pdfBase64)).slice(0, 24000)].filter(Boolean).join("\n\n");
      } catch (e) {
        return err(`解析 PDF 失败：${(e as Error).message}`);
      }
    }
    if (body.docxBase64) {
      try {
        text = [text, (await extractDocx(body.docxBase64)).slice(0, 24000)].filter(Boolean).join("\n\n");
      } catch (e) {
        return err(`解析 Word 失败：${(e as Error).message}`);
      }
    }
    if (!text.trim()) return err("没有可解析的文本（请提供 url / text / pdfBase64 / docxBase64 之一）");

    const provider = getProvider();
    const parsed = await provider.parseJobPosting({ url: body.url, text });

    const draft: Partial<Application> = {
      company: parsed.company,
      role: parsed.role,
      industry: parsed.industry ?? null,
      location: parsed.location ?? null,
      postedAt: parsed.postedAt ?? null,
      deadline: parsed.deadline ?? null,
      salary: parsed.salary ?? null,
      jdSummary: parsed.jdSummary ?? null,
      keywords: parsed.keywords ?? [],
      sourceUrl: body.url ?? null,
      sourceType: body.url ? "url" : body.pdfBase64 ? "pdf" : body.docxBase64 ? "pdf" : "text",
      jdRaw: text.slice(0, 24000),
      status: "wishlist",
    };

    return ok({ draft, providerUsed: provider.name });
  } catch (e: unknown) {
    return err((e as Error).message);
  }
}
