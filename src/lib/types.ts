// 数据模型 — 所有持久化对象都在这里集中定义，前后端共用

export type ApplicationStatus =
  | "wishlist" // 未投递（已收藏）
  | "applied" // 已投递
  | "om_assessment" // OA / 笔试中
  | "interviewing" // 面试中
  | "offer" // 拿到 Offer
  | "rejected" // 已挂
  | "withdrawn"; // 主动撤回

export const APPLICATION_STATUSES: ApplicationStatus[] = [
  "wishlist",
  "applied",
  "om_assessment",
  "interviewing",
  "offer",
  "rejected",
  "withdrawn",
];

export type Season = "summer-2027" | "fall-2026" | "other";

export type InterviewKind =
  | "online_assessment"
  | "phone_screen"
  | "technical"
  | "behavioral"
  | "case"
  | "system_design"
  | "onsite"
  | "final"
  | "other";

export type InterviewOutcome = "pending" | "passed" | "failed" | "cancelled";

export interface Application {
  id: string;
  company: string;
  role: string;
  industry?: string | null;
  location?: string | null;
  season: Season;
  status: ApplicationStatus;
  /** 投递起始（招聘开放）日期 ISO yyyy-MM-dd */
  postedAt?: string | null;
  /** 投递截止 ISO yyyy-MM-dd */
  deadline?: string | null;
  /** 自己实际投递的时间 ISO */
  appliedAt?: string | null;
  sourceUrl?: string | null;
  sourceType?: "url" | "text" | "pdf" | "manual" | null;
  jdRaw?: string | null;
  jdSummary?: string | null;
  /** AI 提取的技能/关键词 — JSON array of string */
  keywords?: string[];
  salary?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Interview {
  id: string;
  applicationId: string;
  /** 第几轮 */
  round: number;
  kind: InterviewKind;
  scheduledAt?: string | null;
  durationMinutes?: number | null;
  interviewer?: string | null;
  outcome: InterviewOutcome;
  /** 题目 / 案例 / 笔试题，Markdown */
  questions?: string | null;
  /** 自己的答题 / 思路记录，Markdown */
  selfNotes?: string | null;
  /** 复盘与改进 */
  reflection?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProfileDoc {
  id: string;
  /** resume / experience / reflection / portfolio / other */
  kind: "resume" | "experience" | "reflection" | "portfolio" | "other";
  title: string;
  content: string; // 纯文本（PDF 已抽取）
  /** AI 解析出的结构化字段 */
  structured?: {
    summary?: string;
    skills?: string[];
    experiences?: Array<{
      org?: string;
      role?: string;
      start?: string;
      end?: string;
      bullets?: string[];
    }>;
    education?: Array<{
      school?: string;
      degree?: string;
      start?: string;
      end?: string;
    }>;
    projects?: Array<{ name?: string; bullets?: string[] }>;
  };
  createdAt: string;
  updatedAt: string;
}

export interface SharedExperience {
  id: string;
  company: string;
  role?: string | null;
  season?: Season | null;
  source?: string | null;
  contributor?: string | null;
  stage?: string | null;
  /** 绑定到某个具体投递（可选） */
  applicationId?: string | null;
  content: string;
  highlights?: string[];
  createdAt: string;
  updatedAt: string;
}

// —— Profile 模块化条目 ——

export type ProfileModule =
  | "basic"        // 基本信息
  | "internship"   // 实习经历
  | "project"      // 项目经历
  | "campus"       // 校内 / 学生活动
  | "award"        // 获奖与证书
  | "skill"        // 技能 / 语言 / 兴趣
  | "reflection";  // 感悟 / 学习笔记

export const PROFILE_MODULES: ProfileModule[] = [
  "basic",
  "internship",
  "project",
  "campus",
  "award",
  "skill",
  "reflection",
];

export interface ProfileEntry {
  id: string;
  module: ProfileModule;
  title: string;
  org?: string | null;
  role?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  location?: string | null;
  summary?: string | null;
  bullets?: string[];
  tags?: string[];
  links?: Array<{ label: string; url: string }>;
  source: "manual" | "pdf" | "docx" | "text";
  sourceDocId?: string | null;
  /** active = 用户已确认 / draft = AI 抽取待确认 */
  status: "active" | "draft";
  createdAt: string;
  updatedAt: string;
}

// —— 应用设置（持久化在 SQLite 的 app_settings 表）——

export interface AppSettings {
  anthropicApiKey?: string;
  anthropicModel?: string;
  /** 小红书 MaaS / AWS Bedrock 代理 */
  bedrockBaseUrl?: string;
  bedrockApiKey?: string;
  bedrockModel?: string;
  bedrockRegion?: string;
  /** 主题 */
  theme?: "light" | "dark" | "system";
  /** 强调色 */
  accent?: "clay" | "sage" | "slate";
}

export interface AiArtifact {
  id: string;
  applicationId?: string | null;
  /** 输出类型 */
  kind: "resume_tailor" | "interview_prep" | "jd_summary" | "experience_brief";
  title: string;
  inputRef?: string | null;
  /** Markdown */
  content: string;
  createdAt: string;
}
