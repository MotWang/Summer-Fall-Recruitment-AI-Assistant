// Mock provider — 不依赖任何外部 API，对原始文本做启发式抽取
// 让整个 App 在没有 API Key 时仍可完整跑通

import type {
  AiProvider,
  MockVideoInterviewEvaluateInput,
  MockVideoInterviewStartInput,
  ParsedEntry,
  ParsedJob,
  ResumeStructured,
} from "./types";
import type { ProfileModule } from "../types";
import { inferIndustryFromText } from "../industries";
import {
  evaluateMockVideoInterviewHeuristic,
  startMockVideoInterviewHeuristic,
} from "./mock-video-interview";

const CN_LOC = [
  "北京", "上海", "深圳", "广州", "杭州", "成都", "南京", "苏州", "武汉", "西安",
  "天津", "重庆", "厦门", "青岛", "香港", "台北",
];
const EN_LOC = [
  "New York", "San Francisco", "Seattle", "Boston", "Chicago", "London", "Singapore",
  "Tokyo", "Hong Kong", "Remote", "Mountain View", "Palo Alto",
];
const INDUSTRIES: Record<string, string> = {
  bank: "银行", invest: "资管", consult: "咨询",
  software: "软件工程", data: "算法 / 数据", product: "互联网产品",
  marketing: "市场 / 运营", design: "设计", research: "二级研究",
  hardware: "硬件 / 半导体", auto: "汽车 / 出行", bio: "生物 / 医疗",
  energy: "能源 / 新能源", media: "市场 / 运营",
};

function firstMatch(text: string, candidates: string[]): string | undefined {
  for (const c of candidates) if (text.includes(c)) return c;
  return undefined;
}

function inferIndustry(text: string): string | undefined {
  return inferIndustryFromText(text) ?? legacyInferIndustry(text);
}

function legacyInferIndustry(text: string): string | undefined {
  const lower = text.toLowerCase();
  if (/(bank|证券|securities|invest|fund|trading|资管)/i.test(text)) return INDUSTRIES.invest;
  if (/(consult|consulting|strategy|麦肯锡|bcg|bain|咨询)/i.test(text)) return INDUSTRIES.consult;
  if (/(data|algorithm|ml|machine learning|算法|数据|nlp)/i.test(text)) return INDUSTRIES.data;
  if (/(product manager|product\s*mgr|产品经理|pm)/i.test(lower)) return INDUSTRIES.product;
  if (/(software|engineer|developer|后端|前端|fullstack|sde)/i.test(lower)) return INDUSTRIES.software;
  if (/(market|brand|growth|运营|品牌)/i.test(lower)) return INDUSTRIES.marketing;
  if (/(design|ux|ui|交互|视觉)/i.test(lower)) return INDUSTRIES.design;
  if (/(research|scientist|博士|科研)/i.test(lower)) return INDUSTRIES.research;
  if (/(chip|semiconductor|hardware|射频|嵌入式)/i.test(lower)) return INDUSTRIES.hardware;
  return undefined;
}

function inferCompany(text: string, fallbackHost?: string): string {
  // 寻找"XX 公司"或"XX, Inc"或邮箱域名
  const m1 = text.match(/([A-Z][A-Za-z0-9&\-\. ]{2,40})\s*(?:Inc\.?|Ltd\.?|LLC|Corp\.?|Company)/);
  if (m1) return m1[1].trim();
  const m2 = text.match(/([一-龥A-Za-z0-9]{2,16})(?:公司|集团|科技|有限公司)/);
  if (m2) return m2[1];
  if (fallbackHost) {
    // 取域名首段
    return fallbackHost.replace(/^www\./, "").split(".")[0];
  }
  return "未识别公司";
}

function inferRole(text: string): string {
  const m = text.match(
    /(实习生|Intern|Internship|Analyst|Associate|Engineer|Scientist|Manager|Designer|Consultant|产品经理|算法工程师|前端|后端|数据分析师|咨询顾问)[A-Za-z0-9一-龥\- ]{0,40}/i,
  );
  return m ? m[0].trim() : "未识别岗位";
}

function inferDate(text: string, kind: "posted" | "deadline"): string | undefined {
  // 找 ISO 或 yyyy-mm-dd / yyyy/m/d
  const all = Array.from(text.matchAll(/(20\d{2})[\-\/\.年](\d{1,2})[\-\/\.月](\d{1,2})/g));
  if (all.length === 0) return undefined;
  const toIso = (m: RegExpMatchArray) =>
    `${m[1]}-${m[2].padStart(2, "0")}-${m[3].padStart(2, "0")}`;
  if (kind === "posted") return toIso(all[0]);
  // deadline: 查找带"截止/Deadline/Apply by"附近的日期，否则用最后一个
  const ctx = text.match(/(截止|Deadline|Apply\s*by|Closes?)[^\d]{0,30}(20\d{2})[\-\/\.年](\d{1,2})[\-\/\.月](\d{1,2})/i);
  if (ctx) return `${ctx[2]}-${ctx[3].padStart(2, "0")}-${ctx[4].padStart(2, "0")}`;
  return toIso(all[all.length - 1]);
}

function extractKeywords(text: string): string[] {
  const dict = [
    "Python", "Java", "C++", "Go", "Rust", "TypeScript", "JavaScript", "SQL",
    "React", "Vue", "Node", "Spring", "Kubernetes", "Docker", "AWS", "GCP",
    "Pandas", "PyTorch", "TensorFlow", "LLM", "NLP", "Computer Vision",
    "Figma", "Sketch", "A/B testing", "Tableau", "Power BI",
    "金融建模", "DCF", "Excel", "VBA", "Bloomberg",
    "用户研究", "Roadmap", "需求分析", "数据分析",
  ];
  const hit = new Set<string>();
  for (const w of dict) {
    const re = new RegExp(`\\b${w.replace(/[.+]/g, "\\$&")}\\b`, "i");
    if (re.test(text)) hit.add(w);
  }
  return Array.from(hit).slice(0, 20);
}

function isDomesticTrack(application: { company: string; location?: string | null }): boolean {
  return /[一-龥]/.test(application.company) || /北京|上海|深圳|广州|杭州|成都|南京|苏州|武汉|西安/.test(application.location ?? "");
}

export const mockProvider: AiProvider = {
  name: "mock",

  async parseJobPosting({ url, text }) {
    const raw = (text ?? "") + (url ? `\n[source]${url}` : "");
    const host = url ? new URL(url).hostname : undefined;
    const company = inferCompany(raw, host);
    const role = inferRole(raw);
    const location = firstMatch(raw, CN_LOC) ?? firstMatch(raw, EN_LOC);
    const posted = inferDate(raw, "posted");
    const deadline = inferDate(raw, "deadline");
    const salaryM = raw.match(/(¥|RMB|￥|\$|USD)\s?\d[\d,\.kK\-万万 ]+/);
    const summary =
      raw
        .replace(/\s+/g, " ")
        .slice(0, 240) + (raw.length > 240 ? "…" : "");
    const out: ParsedJob = {
      company,
      role,
      industry: inferIndustry(raw),
      location,
      postedAt: posted,
      deadline,
      salary: salaryM ? salaryM[0] : undefined,
      jdSummary: summary,
      keywords: extractKeywords(raw),
    };
    return out;
  },

  async parseResume(text) {
    const skills = extractKeywords(text);
    const lines = text.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    const summary = lines.slice(0, 3).join(" ");
    // 极简启发：把含日期段的行当作经历
    const experiences: ResumeStructured["experiences"] = [];
    let cur: NonNullable<ResumeStructured["experiences"]>[number] | null = null;
    for (const l of lines) {
      const dateM = l.match(/(20\d{2})[\-\/\.年]\d{1,2}[^\-—~至到\s]*\s*[-—~至到]\s*(20\d{2}|至今|present|Present)/);
      if (dateM) {
        if (cur) experiences.push(cur);
        cur = { org: l.split(/[，,\-—]/)[0].slice(0, 40), start: dateM[1], end: dateM[2], bullets: [] };
      } else if (cur && l.length < 200) {
        cur.bullets!.push(l);
      }
    }
    if (cur) experiences.push(cur);
    return { summary, skills, experiences };
  },

  async parseResumeIntoEntries(text) {
    return splitResumeToEntries(text);
  },

  async parseSharedExperience(raw, hint) {
    const company = hint?.company ?? inferCompany(raw);
    const role = inferRole(raw);
    const highlights: string[] = [];
    const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
    for (const l of lines) {
      if (/[?？]$/.test(l) || /^[一二三四五六七八九十\d]+[、\.]/.test(l) || /题|考|问|案例|case/i.test(l)) {
        highlights.push(l.slice(0, 120));
        if (highlights.length >= 12) break;
      }
    }
    return {
      company,
      role,
      stage: undefined,
      highlights,
      cleanedContent: raw.trim(),
    };
  },

  async optimizeResume({ application, profileEntries = [] }) {
    const skillsFromJob = application.keywords ?? [];
    const tagsFromMe = new Set(
      profileEntries.flatMap((e) => [...(e.tags ?? []), ...(e.bullets ?? []).flatMap(extractKeywords)]),
    );
    const match = skillsFromJob.filter((s) => tagsFromMe.has(s));
    const miss = skillsFromJob.filter((s) => !tagsFromMe.has(s));
    const topEntries = profileEntries
      .filter((e) => e.module === "internship" || e.module === "project")
      .slice(0, 4);
    const picked = topEntries.slice(0, 5);
    const domestic = isDomesticTrack(application);
    return [
      `# 简历优化建议 — ${application.company} · ${application.role}`,
      ``,
      `## A. 中文版（面向国内公司）`,
      `### 一、岗位画像与关键词命中`,
      `- 岗位关键词（JD）：${skillsFromJob.slice(0, 8).join("、") || "—"}`,
      `- 已命中能力：${match.length ? match.join("、") : "暂无明显命中，请补充项目证据"}`,
      `- 优先补强：${miss.length ? miss.slice(0, 6).join("、") : "建议强化结果量化与影响范围表达"}`,
      `- 风险点：当前表述偏“做过什么”，需改为“做到什么结果”。${domestic ? "并补充跨团队协作与执行闭环。" : ""}`,
      ``,
      `### 二、Bullet 逐条改写建议（含原文对照）`,
      ...picked.flatMap((e) => {
        const original = (e.bullets?.[0] ?? e.summary ?? "暂无可用原文").replace(/\s+/g, " ");
        return [
          `#### ${e.title}${e.org ? ` · ${e.org}` : ""}`,
          `- 原文："${original}"`,
          `- 问题：动作和结果不够具体，缺少量化与业务影响。`,
          `- 改写建议：用“动作 + 方法 + 结果 + 影响”四段式重写，并嵌入关键词。`,
          `- 可替代版本（1 行）：主导【核心动作】，通过【方法/模型】实现【量化结果】，支撑【业务影响】。`,
          ``,
        ];
      }),
      `### 三、一页简历重排建议（国内版）`,
      `- 抬头：姓名 + 联系方式 + 目标岗位（与 ${application.role} 对齐）。`,
      `- 教育：仅保留最有含金量信息（学校、学位、时间、GPA/排名可选）。`,
      `- 核心经历（2-3 段）：优先放与岗位最相关的实习/项目。`,
      `- 项目/交易经验：每段 3-4 条 bullet，控制在一页内。`,
      `- 技能：仅保留与 JD 强相关项（例如 ${miss.slice(0, 3).join("、") || "行业研究、财务分析、沟通表达"}）。`,
      `- 语言与补充：放页尾，避免挤占核心经历篇幅。`,
      ``,
      `## B. English Version (for international applications)`,
      `### 1) Fit Snapshot & Keyword Coverage`,
      `- Target role keywords: ${skillsFromJob.slice(0, 8).join(", ") || "N/A"}.`,
      `- Evidenced strengths: ${match.length ? match.join(", ") : "Need stronger evidence with quantified impact"}.`,
      `- Priority gaps: ${miss.length ? miss.slice(0, 5).join(", ") : "Sharpen impact statements and ownership framing"}.`,
      `- Positioning note: frame outcomes with ownership, scope, and measurable business results.`,
      ``,
      `### 2) Bullet-level Rewrites with Side-by-side Context`,
      ...picked.flatMap((e) => {
        const original = (e.bullets?.[0] ?? e.summary ?? "No source bullet").replace(/\s+/g, " ");
        return [
          `#### ${e.title}${e.org ? ` · ${e.org}` : ""}`,
          `- Original: "${original}"`,
          `- Gap: The statement describes activity but not quantified impact.`,
          `- Rewrite Direction: Use action + method + metric + business outcome.`,
          `- One-line Strong Version: Led [core initiative], applied [method], delivered [metric], and improved [business KPI].`,
          ``,
        ];
      }),
      `### 3) One-page Resume Structure (International Version)`,
      `- Header: Name | Contact | LinkedIn (optional) | Target Function.`,
      `- Education: concise and relevant; keep only high-signal details.`,
      `- Experience: 2-3 most relevant experiences first; 3-4 impact bullets each.`,
      `- Projects: include only if they add differentiated evidence.`,
      `- Skills: focused list aligned to the job; remove generic tools.`,
      `- Keep every bullet scannable in under two lines.`,
    ].join("\n");
  },

  async prepareInterview({ application, sharedExperiences, profileEntries = [] }) {
    const relevantExp = sharedExperiences.filter(
      (e) => e.company.toLowerCase() === application.company.toLowerCase(),
    );
    const qBank = relevantExp.flatMap((e) => e.highlights ?? []).slice(0, 15);
    const topEntries = profileEntries
      .filter((e) => e.module === "internship" || e.module === "project")
      .slice(0, 4);
    return [
      `# 面试准备 — ${application.company} · ${application.role}`,
      ``,
      `> 本地启发式输出。`,
      ``,
      `## 公司 / 岗位速读`,
      `- 行业：${application.industry ?? "—"}`,
      `- 地点：${application.location ?? "—"}`,
      `- JD 关键词：${(application.keywords ?? []).join("、") || "—"}`,
      ``,
      `## 来自面经库的高频问题`,
      qBank.length
        ? qBank.map((q, i) => `${i + 1}. ${q}`).join("\n")
        : "_暂无该公司面经，先去面经库上传几份。_",
      ``,
      `## 用你自己的经历串答案`,
      ...topEntries.map((e) => `- **${e.title}**${e.org ? ` · ${e.org}` : ""}：${e.summary ?? "—"}`),
      ``,
      `## 建议的复盘清单`,
      `- [ ] 自我介绍 60s / 120s 双版本`,
      `- [ ] Why this company / Why this role`,
      `- [ ] 用 STAR 准备 3 个项目深挖`,
      `- [ ] 反向提问 3 个`,
    ].join("\n");
  },

  async startMockVideoInterview(input: MockVideoInterviewStartInput) {
    return startMockVideoInterviewHeuristic(input);
  },

  async evaluateMockVideoInterview(input: MockVideoInterviewEvaluateInput) {
    return evaluateMockVideoInterviewHeuristic(input);
  },
};

// —— 启发式：把简历全文切成 ProfileEntry 列表 ——

interface Block {
  module: ProfileModule;
  text: string;
}

const SECTION_HINTS: Array<{ module: ProfileModule; re: RegExp }> = [
  { module: "basic", re: /基本信息|个人信息|联系方式|Personal\s*Info|Contact|Profile/i },
  { module: "internship", re: /实习|工作经历|Work\s*Experience|Internship|Professional\s*Experience|Employment/i },
  { module: "project", re: /项目经历|项目经验|项目|Projects?\b|Project\s*Experience/i },
  { module: "campus", re: /学生工作|校内|社团|学生干部|Campus|Student\s*Organization|Leadership/i },
  { module: "award", re: /获奖|奖项|荣誉|证书|Awards?|Honors?|Certifications?/i },
  { module: "skill", re: /技能|Skills?|语言|Languages?|工具|Tools/i },
];

function detectModule(line: string): ProfileModule | null {
  for (const h of SECTION_HINTS) if (h.re.test(line)) return h.module;
  return null;
}

const DATE_RANGE = /(20\d{2}[\.\-\/年]?\d{0,2})\s*[-—~至到]\s*(20\d{2}[\.\-\/年]?\d{0,2}|present|至今|Present|Now|现在)/;

function splitResumeToEntries(text: string): ParsedEntry[] {
  const out: ParsedEntry[] = [];
  if (!text.trim()) return out;
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/[ \t]+/g, " ").trimEnd());

  const blocks: Block[] = [];
  let curMod: ProfileModule = "internship";
  let buf: string[] = [];
  function flushBlock() {
    if (buf.length === 0) return;
    blocks.push({ module: curMod, text: buf.join("\n").trim() });
    buf = [];
  }
  for (const l of lines) {
    const m = detectModule(l);
    if (m) {
      flushBlock();
      curMod = m;
      continue;
    }
    buf.push(l);
  }
  flushBlock();

  // 基本信息
  const allText = text.replace(/\s+/g, " ");
  const email = allText.match(/[\w.\-+]+@[\w.\-]+\.[a-zA-Z]{2,}/)?.[0];
  const phone =
    allText.match(/(?:\+?\d{2,3}[\s\-]?)?1\d{10}/)?.[0] ??
    allText.match(/\+?\d{1,3}[\s\-]?\(?\d{2,4}\)?[\s\-]?\d{3,4}[\s\-]?\d{3,4}/)?.[0];
  const school = allText.match(/([一-龥A-Za-z\s]{2,30}(?:大学|学院|University|College|Institute))/)?.[0]?.trim();
  if (email || phone || school) {
    const bullets: string[] = [];
    if (email) bullets.push(`邮箱：${email}`);
    if (phone) bullets.push(`电话：${phone}`);
    if (school) bullets.push(`学校：${school}`);
    out.push({
      module: "basic",
      title: "联系方式 & 教育背景",
      org: school ?? null,
      role: null,
      startDate: null,
      endDate: null,
      location: null,
      summary: bullets.join(" · "),
      bullets,
      tags: [],
      links: [],
    });
  }

  for (const b of blocks) {
    if (b.module === "basic") continue;
    if (b.module === "skill") {
      const skills = extractKeywords(b.text);
      if (skills.length) {
        out.push({
          module: "skill",
          title: "技能标签",
          org: null,
          role: null,
          startDate: null,
          endDate: null,
          location: null,
          summary: skills.slice(0, 10).join(" · "),
          bullets: [],
          tags: skills,
          links: [],
        });
      }
      continue;
    }
    const items = splitBlockByDateOrHeading(b.text);
    for (const item of items) {
      const dm = item.match(DATE_RANGE);
      const headlineLine =
        item.split("\n").find((l) => l.trim().length > 0 && l.trim().length < 80) ?? item.slice(0, 60);
      const bullets = item
        .split(/\n+/)
        .map((l) => l.replace(/^[\-\*•·\d\.]+\s*/, "").trim())
        .filter((l) => l && l !== headlineLine.trim())
        .slice(0, 6);
      const titleCand = headlineLine.replace(DATE_RANGE, "").replace(/\s+\|\s+/g, " · ").trim();
      out.push({
        module: b.module,
        title: titleCand.slice(0, 60) || `${b.module} 条目`,
        org: titleCand.split(/[·\|\-]/)[0]?.slice(0, 40) ?? null,
        role: titleCand.split(/[·\|\-]/)[1]?.slice(0, 40) ?? null,
        startDate: dm?.[1]?.replace(/[年\.\/]/g, "-").slice(0, 7) ?? null,
        endDate:
          dm?.[2] && /至今|present|now/i.test(dm[2])
            ? "present"
            : dm?.[2]?.replace(/[年\.\/]/g, "-").slice(0, 7) ?? null,
        location: null,
        summary: bullets[0] ?? null,
        bullets,
        tags: [],
        links: [],
      });
    }
  }

  return out.slice(0, 30);
}

function splitBlockByDateOrHeading(text: string): string[] {
  const lines = text.split(/\n/);
  const items: string[] = [];
  let cur: string[] = [];
  function push() {
    if (cur.length) items.push(cur.join("\n").trim());
    cur = [];
  }
  for (const l of lines) {
    const isHeading = DATE_RANGE.test(l) || /^[一二三四五六七八九十\d]+[、\.]/.test(l);
    if (isHeading && cur.length) push();
    cur.push(l);
  }
  push();
  return items.filter((x) => x.length > 4);
}
