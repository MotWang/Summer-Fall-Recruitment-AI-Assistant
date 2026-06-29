// Anthropic provider — 仅当 process.env.ANTHROPIC_API_KEY 存在时才会被实例化
// 输出固定使用 JSON / Markdown，由调用方解析

import Anthropic from "@anthropic-ai/sdk";
import type {
  AiProvider,
  InterviewPrepInput,
  ParsedEntry,
  ParsedExperience,
  ParsedJob,
  ResumeStructured,
} from "./types";
import { getAppSettings } from "../repo";
import { bedrockConverse, isBedrockConfigured } from "./bedrock-client";

// 读取顺序：DB 设置 > 环境变量。Settings 页填入的 key 即时生效。
function readKey(): string | undefined {
  try {
    const s = getAppSettings();
    if (s.anthropicApiKey && s.anthropicApiKey.trim()) return s.anthropicApiKey.trim();
  } catch {
    // 极端情况下 DB 尚未就绪：回落到 env
  }
  return process.env.ANTHROPIC_API_KEY;
}

function readModel(): string {
  try {
    const s = getAppSettings();
    if (s.anthropicModel && s.anthropicModel.trim()) return s.anthropicModel.trim();
  } catch {}
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-5";
}

function client() {
  const key = readKey();
  if (!key) throw new Error("Anthropic API Key 未配置（请在设置页填入）");
  return new Anthropic({ apiKey: key });
}

async function textCall(system: string, user: string, maxTokens = 4096): Promise<string> {
  if (isBedrockConfigured()) {
    return bedrockConverse({ system, user, maxTokens });
  }
  const c = client();
  const resp = await c.messages.create({
    model: readModel(),
    max_tokens: maxTokens,
    system,
    messages: [{ role: "user", content: user }],
  });
  return resp.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
}

async function jsonCall<T>(system: string, user: string): Promise<T> {
  const text = await textCall(
    system,
    user + "\n\n请只用紧凑 JSON 回答，不要任何额外说明、不要 markdown 代码块。",
  );
  const cleaned = text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
  return JSON.parse(cleaned) as T;
}

async function mdCall(system: string, user: string): Promise<string> {
  return textCall(system, user);
}

function providerName(): "bedrock" | "anthropic" {
  return isBedrockConfigured() ? "bedrock" : "anthropic";
}

export const anthropicProvider: AiProvider = {
  get name() {
    return providerName();
  },

  async parseJobPosting({ url, text }) {
    return jsonCall<ParsedJob>(
      "你是招聘信息抽取助手。根据用户提供的 JD 原文（可能含网页噪声），抽取结构化字段。日期统一 yyyy-MM-dd。",
      `URL: ${url ?? ""}\n---\n${text ?? ""}\n\n字段：company, role, industry, location, postedAt, deadline, salary, jdSummary, keywords (array of strings, ≤12)`,
    );
  },

  async parseResume(text) {
    return jsonCall<ResumeStructured>(
      "你是简历解析助手，按 schema 输出。",
      `简历正文：\n${text}\n\nSchema：summary, skills[], experiences[{org,role,start,end,bullets[]}], education[{school,degree,start,end}], projects[{name,bullets[]}]`,
    );
  },

  async parseResumeIntoEntries(text) {
    const schemaDoc = [
      "把简历正文切分成 ProfileEntry[]，输出 JSON 数组。",
      "每条 entry 字段：",
      "  module: 'basic' | 'internship' | 'project' | 'campus' | 'award' | 'skill' | 'reflection'",
      "  title (≤60字), org, role, startDate (yyyy-MM), endDate (yyyy-MM 或 'present'),",
      "  location, summary, bullets[] (每条 ≤140字), tags[], links[{label,url}]",
      "规则：",
      "- 信息归到最贴切的 module，没有的字段省略",
      "- bullets 保留量化数字、关键术语",
      "- 基本信息（姓名/邮箱/电话/学校）做成 1 条 module='basic'",
      "- 不要编造内容；找不到就为空",
    ].join("\n");
    const data = await jsonCall<{ entries: ParsedEntry[] } | ParsedEntry[]>(
      "你是简历结构化解析助手。",
      `${schemaDoc}\n\n简历正文：\n${text}\n\n请只返回 JSON 数组（顶层可以是 { entries: [...] } 或直接 [...]）`,
    );
    const arr = Array.isArray(data) ? data : (data as { entries: ParsedEntry[] }).entries ?? [];
    return arr.filter((e) => e && e.module && e.title).slice(0, 40);
  },

  async parseSharedExperience(raw, hint) {
    return jsonCall<ParsedExperience>(
      "你是面经整理助手。输入是一段面经原文，请把题目/考点抽出为 highlights，并清洗正文。",
      `公司提示：${hint?.company ?? "未知"}\n原文：\n${raw}\n\nSchema：company, role, stage, highlights (array of strings), cleanedContent (string)`,
    );
  },

  async optimizeResume({ application, profileDocs }) {
    const ctx = profileDocs
      .map((d) => `### ${d.title}\n${d.content.slice(0, 1500)}`)
      .join("\n\n");
    return mdCall(
      "你是资深求职教练，请输出 Markdown 报告，先给出 JD 关键词覆盖度，再给逐条 bullet 改写建议（含量化方向），最后给出建议的 1 页简历结构。",
      `# 目标岗位\n${application.company} · ${application.role}\n\nJD 摘要：${application.jdSummary ?? ""}\n关键词：${(application.keywords ?? []).join(", ")}\n\n# 候选人 Profile\n${ctx}`,
    );
  },

  async prepareInterview({ application, profileDocs, sharedExperiences }: InterviewPrepInput) {
    const expCtx = sharedExperiences
      .slice(0, 10)
      .map((e) => `- (${e.company}/${e.role ?? "?"}) ${e.content.slice(0, 600)}`)
      .join("\n");
    const profCtx = profileDocs
      .slice(0, 4)
      .map((d) => `### ${d.title}\n${d.content.slice(0, 1200)}`)
      .join("\n\n");
    return mdCall(
      "你是面试教练。输出 Markdown：先列高频题（按行为/技术/案例分组），再针对每题给候选人个性化答题骨架（基于其经历），最后给出反向提问建议。",
      `# 岗位\n${application.company} · ${application.role}\n关键词：${(application.keywords ?? []).join(", ")}\nJD 摘要：${application.jdSummary ?? ""}\n\n# 面经参考\n${expCtx}\n\n# 候选人材料\n${profCtx}`,
    );
  },
};
