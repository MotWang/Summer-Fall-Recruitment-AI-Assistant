// Anthropic provider — 仅当 process.env.ANTHROPIC_API_KEY 存在时才会被实例化
// 输出固定使用 JSON / Markdown，由调用方解析

import Anthropic from "@anthropic-ai/sdk";
import type {
  AiProvider,
  InterviewPrepInput,
  MockVideoInterviewEvaluateInput,
  MockVideoInterviewEvaluation,
  MockVideoInterviewSession,
  MockVideoInterviewStartInput,
  ParsedEntry,
  ParsedExperience,
  ParsedJob,
  ResumeStructured,
} from "./types";
import { getAppSettings } from "../repo";
import { bedrockConverse } from "./bedrock-client";
import { openrouterChat } from "./openrouter-client";
import { resolveActiveProviderId } from "./provider-routing";
import { buildInterviewContext } from "./interview-context";
import {
  evaluateMockVideoInterviewHeuristic,
  startMockVideoInterviewHeuristic,
} from "./mock-video-interview";
import { APPLICATION_INDUSTRIES } from "@/lib/industries";

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
  const route = resolveActiveProviderId();
  if (route === "gateway") {
    return bedrockConverse({ system, user, maxTokens });
  }
  if (route === "openrouter") {
    return openrouterChat({ system, user, maxTokens });
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

function providerName() {
  return resolveActiveProviderId();
}

const INDUSTRY_HINT = APPLICATION_INDUSTRIES.join("、");

export const anthropicProvider: AiProvider = {
  get name() {
    return providerName();
  },

  async parseJobPosting({ url, text }) {
    return jsonCall<ParsedJob>(
      "你是招聘信息抽取助手。根据用户提供的 JD 原文（可能含网页噪声），抽取结构化字段。日期统一 yyyy-MM-dd。",
      `URL: ${url ?? ""}\n---\n${text ?? ""}\n\n字段：company, role, industry（从以下选一：${INDUSTRY_HINT}）, location, postedAt, deadline, salary, jdSummary, keywords (array of strings, ≤12)`,
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

  async optimizeResume({ application, profileEntries = [] }) {
    const bundle = buildInterviewContext({
      application,
      profileDocs: [],
      profileEntries,
      sharedExperiences: [],
    });
    return mdCall(
      [
        "你是顶级投行/咨询求职教练，请输出专业、可直接 read-through 的 Markdown。",
        "要求输出双版本：中文版本 + English version。",
        "重要：英文版本不能直译中文，必须按海外招聘语境重写。",
        "重要：国内投递与海外投递标准不同，必须分别体现。",
        "",
        "强制结构（必须按此顺序，标题原样保留）：",
        "## A. 中文版（面向国内公司）",
        "### 一、岗位画像与关键词命中",
        "- 4-6 条短 bullet，总结岗位核心能力与候选人匹配度。",
        "- 强调国内招聘常见偏好：执行落地、业务协同、项目推进、稳定性、汇报链清晰。",
        "",
        "### 二、Bullet 逐条改写建议（含原文对照）",
        "- 仅挑 4-6 条最关键经历。",
        "- 每条使用以下子结构：",
        "#### [经历标题]",
        "- 原文：\"...\"",
        "- 问题：...",
        "- 改写建议：...",
        "- 可替代版本（1 行）：...",
        "",
        "### 三、一页简历重排建议（国内版）",
        "- 给出模块顺序 + 每个模块重点（5-8 条）。",
        "",
        "## B. English Version (for international applications)",
        "### 1) Fit Snapshot & Keyword Coverage",
        "- 4-6 concise bullets in natural business English.",
        "- Emphasize global hiring expectations: ownership, measurable impact, problem solving, cross-functional influence.",
        "",
        "### 2) Bullet-level Rewrites with Side-by-side Context",
        "- Pick 4-6 most relevant bullets.",
        "- For each item include:",
        "#### [Experience Title]",
        "- Original:",
        "- Gap:",
        "- Rewrite Direction:",
        "- One-line Strong Version:",
        "",
        "### 3) One-page Resume Structure (International Version)",
        "- 5-8 bullets on section order and emphasis.",
        "",
        "输出约束：",
        "- 禁止 emoji、icon、logo、花哨符号。",
        "- 每条 bullet 控制在 1-2 行；必要时换行，不要一大段。",
        "- 中英文都要简洁，总长度控制在 1200-1800 中文字符等效。",
      ].join("\n"),
      bundle.contextText,
    );
  },

  async prepareInterview({ application, profileEntries = [], sharedExperiences }: InterviewPrepInput) {
    const bundle = buildInterviewContext({
      application,
      profileDocs: [],
      profileEntries,
      sharedExperiences,
    });
    return mdCall(
      "你是面试教练。输出 Markdown：①高频题（按行为/技术/案例分组）；②针对每题给候选人个性化答题骨架（必须基于其上面的 Profile 条目，引用具体经历）；③反向提问 3 条建议。",
      bundle.contextText,
    );
  },

  async startMockVideoInterview(input: MockVideoInterviewStartInput) {
    const route = resolveActiveProviderId();
    if (route === "mock") {
      return startMockVideoInterviewHeuristic(input);
    }
    const bundle = buildInterviewContext(input);
    try {
      return await jsonCall<MockVideoInterviewSession>(
        "你是资深面试官。根据候选人材料与 JD，设计一场模拟视频面试脚本。输出 JSON，字段：sessionId(随机uuid字符串), company, role, interviewKind, round, interviewerPersona, openingScript, closingScript, contextSummary(简短), questions[{id,order,category, prompt, timeLimitSec, evaluationRubric, probeHints?}]。category 取 opening|behavioral|technical|case|culture|closing。questions 5-7 题，prompt 用面试官口语。",
        `${bundle.contextText}\n\n面试轮次：${input.round ?? 1}，类型：${input.interviewKind ?? "technical"}`,
      );
    } catch {
      return startMockVideoInterviewHeuristic(input);
    }
  },

  async evaluateMockVideoInterview(input: MockVideoInterviewEvaluateInput) {
    const route = resolveActiveProviderId();
    if (route === "mock") {
      return evaluateMockVideoInterviewHeuristic(input);
    }
    const bundle = buildInterviewContext({
      application: input.application,
      profileDocs: input.profileDocs ?? [],
      profileEntries: input.profileEntries,
      sharedExperiences: [],
    });
    const payload = {
      session: input.session,
      answers: input.answers,
    };
    try {
      return await jsonCall<MockVideoInterviewEvaluation>(
        "你是面试评估官。根据题目、评分标准与候选人回答文本，输出 JSON：sessionId, overallScore(0-100), dimensions{relevance,structure,depth,communication,roleFit}, questionEvaluations[{questionId,score,strengths[],improvements[],sampleAnswerOutline}], summary, topImprovements[], passLikelihood(low|medium|high)。",
        `${bundle.contextText}\n\n# 面试脚本与作答\n${JSON.stringify(payload).slice(0, 12000)}`,
      );
    } catch {
      return evaluateMockVideoInterviewHeuristic(input);
    }
  },
};
