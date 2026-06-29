// Mock provider — 不依赖任何外部 API，对原始文本做启发式抽取
// 让整个 App 在没有 API Key 时仍可完整跑通

import type {
  AiProvider,
  ParsedEntry,
  ParsedJob,
  ResumeStructured,
} from "./types";
import type { ProfileModule } from "../types";

const CN_LOC = [
  "北京", "上海", "深圳", "广州", "杭州", "成都", "南京", "苏州", "武汉", "西安",
  "天津", "重庆", "厦门", "青岛", "香港", "台北",
];
const EN_LOC = [
  "New York", "San Francisco", "Seattle", "Boston", "Chicago", "London", "Singapore",
  "Tokyo", "Hong Kong", "Remote", "Mountain View", "Palo Alto",
];
const INDUSTRIES: Record<string, string> = {
  bank: "金融 / 银行", invest: "金融 / 投资", consult: "咨询",
  software: "互联网 / 软件", data: "数据 / 算法", product: "产品",
  marketing: "市场 / 品牌", design: "设计", research: "研究",
  hardware: "硬件 / 半导体", auto: "汽车 / 出行", bio: "生物 / 医疗",
  energy: "能源 / 新能源", media: "媒体 / 文娱",
};

function firstMatch(text: string, candidates: string[]): string | undefined {
  for (const c of candidates) if (text.includes(c)) return c;
  return undefined;
}

function inferIndustry(text: string): string | undefined {
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

  async optimizeResume({ application, profileDocs, profileEntries }) {
    void profileEntries;
    const skillsFromJob = application.keywords ?? [];
    const skillsFromMe = new Set(
      profileDocs.flatMap((d) => d.structured?.skills ?? extractKeywords(d.content)),
    );
    const match = skillsFromJob.filter((s) => skillsFromMe.has(s));
    const miss = skillsFromJob.filter((s) => !skillsFromMe.has(s));
    return [
      `# 简历优化建议 — ${application.company} · ${application.role}`,
      ``,
      `> 当前为本地启发式输出（未配置 Anthropic API Key）。配置后将由 Claude 给出更细的逐条改写。`,
      ``,
      `## 1. JD 关键词命中`,
      `- 已覆盖：${match.length ? match.join("、") : "（暂无明显命中）"}`,
      `- 建议补强：${miss.length ? miss.join("、") : "（无）"}`,
      ``,
      `## 2. 建议的 Bullet 改写方向`,
      `- 把"参与"改为"主导/独立完成"，并补一个量化数字（提升 X%、覆盖 N 用户、节省 H 小时）。`,
      `- 每条 bullet 用 STAR（Situation-Task-Action-Result）压缩到一行半内。`,
      `- 在最相关的两段经历中，显式出现 JD 中的「${miss.slice(0, 3).join("、") || "关键术语"}」。`,
      ``,
      `## 3. 个人 Profile 抽取概览`,
      ...profileDocs.slice(0, 3).map(
        (d) => `- **${d.title}**：${(d.structured?.summary ?? d.content).slice(0, 80)}…`,
      ),
    ].join("\n");
  },

  async prepareInterview({ application, profileDocs, sharedExperiences, profileEntries }) {
    void profileEntries;
    const relevantExp = sharedExperiences.filter(
      (e) => e.company.toLowerCase() === application.company.toLowerCase(),
    );
    const qBank = relevantExp.flatMap((e) => e.highlights ?? []).slice(0, 15);
    return [
      `# 面试准备 — ${application.company} · ${application.role}`,
      ``,
      `> 当前为本地启发式输出（未配置 Anthropic API Key）。`,
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
      ...profileDocs.slice(0, 4).map((d) => `- 可援引：${d.title}`),
      ``,
      `## 建议的复盘清单`,
      `- [ ] 自我介绍 60s / 120s 双版本`,
      `- [ ] Why this company / Why this role`,
      `- [ ] 用 STAR 准备 3 个项目深挖`,
      `- [ ] 反向提问 3 个`,
    ].join("\n");
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
