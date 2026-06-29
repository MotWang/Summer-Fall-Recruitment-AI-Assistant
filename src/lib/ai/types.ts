// AI 适配层对外暴露的稳定接口 — 任何 provider 都需实现这一组方法

import type { Application, ProfileDoc, ProfileEntry, SharedExperience } from "../types";

export interface ParsedJob {
  company: string;
  role: string;
  industry?: string;
  location?: string;
  postedAt?: string;   // yyyy-MM-dd
  deadline?: string;   // yyyy-MM-dd
  salary?: string;
  jdSummary?: string;
  keywords?: string[];
}

export interface ParsedExperience {
  company: string;
  role?: string;
  stage?: string;
  highlights: string[];
  /** 清洗后的正文，可保留 markdown */
  cleanedContent: string;
}

export interface ResumeStructured {
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
}

export interface InterviewPrepInput {
  application: Application;
  profileDocs: ProfileDoc[];
  profileEntries?: ProfileEntry[];
  sharedExperiences: SharedExperience[];
}

export type ParsedEntry = Omit<ProfileEntry, "id" | "createdAt" | "updatedAt" | "status" | "source" | "sourceDocId">;

export interface AiProvider {
  readonly name: "anthropic" | "bedrock" | "mock";
  parseJobPosting(raw: { url?: string; text?: string }): Promise<ParsedJob>;
  parseResume(text: string): Promise<ResumeStructured>;
  /** 把简历 / CV 全文解析为模块化的条目列表 */
  parseResumeIntoEntries(text: string): Promise<ParsedEntry[]>;
  parseSharedExperience(raw: string, hint?: { company?: string }): Promise<ParsedExperience>;
  optimizeResume(input: {
    application: Application;
    profileDocs: ProfileDoc[];
    profileEntries?: ProfileEntry[];
  }): Promise<string>;
  prepareInterview(input: InterviewPrepInput): Promise<string>;
}
