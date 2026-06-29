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
  /** @deprecated 仅为向后兼容保留；当前实现读 profileEntries */
  profileDocs?: ProfileDoc[];
  profileEntries?: ProfileEntry[];
  sharedExperiences: SharedExperience[];
}

export type MockInterviewCategory =
  | "opening"
  | "behavioral"
  | "technical"
  | "case"
  | "culture"
  | "closing";

export interface MockInterviewQuestion {
  id: string;
  order: number;
  category: MockInterviewCategory;
  /** 面试官在视频里说的话 */
  prompt: string;
  /** 回答时间建议（秒） */
  timeLimitSec: number;
  /** 评估时关注的要点 */
  evaluationRubric: string;
  probeHints?: string[];
}

export interface MockVideoInterviewSession {
  sessionId: string;
  company: string;
  role: string;
  interviewKind: string;
  round: number;
  interviewerPersona: string;
  openingScript: string;
  questions: MockInterviewQuestion[];
  closingScript: string;
  /** 生成时使用的解析上下文摘要 */
  contextSummary: string;
}

export interface MockVideoInterviewAnswer {
  questionId: string;
  transcript: string;
  durationSec?: number;
}

export interface MockQuestionEvaluation {
  questionId: string;
  score: number;
  strengths: string[];
  improvements: string[];
  sampleAnswerOutline?: string;
}

export interface MockVideoInterviewEvaluation {
  sessionId: string;
  overallScore: number;
  dimensions: {
    relevance: number;
    structure: number;
    depth: number;
    communication: number;
    roleFit: number;
  };
  questionEvaluations: MockQuestionEvaluation[];
  summary: string;
  topImprovements: string[];
  passLikelihood: "low" | "medium" | "high";
}

export interface MockVideoInterviewStartInput extends InterviewPrepInput {
  round?: number;
  interviewKind?: string;
}

export interface MockVideoInterviewEvaluateInput {
  application: Application;
  session: MockVideoInterviewSession;
  answers: MockVideoInterviewAnswer[];
  profileDocs?: ProfileDoc[];
  profileEntries?: ProfileEntry[];
}

export type ParsedEntry = Omit<ProfileEntry, "id" | "createdAt" | "updatedAt" | "status" | "source" | "sourceDocId">;

export type { AiProviderId } from "../types";

export interface AiProvider {
  readonly name: import("../types").AiProviderId;
  parseJobPosting(raw: { url?: string; text?: string }): Promise<ParsedJob>;
  parseResume(text: string): Promise<ResumeStructured>;
  parseResumeIntoEntries(text: string): Promise<ParsedEntry[]>;
  parseSharedExperience(raw: string, hint?: { company?: string }): Promise<ParsedExperience>;
  optimizeResume(input: {
    application: Application;
    /** @deprecated 仅为向后兼容保留；当前实现读 profileEntries */
    profileDocs?: ProfileDoc[];
    profileEntries?: ProfileEntry[];
  }): Promise<string>;
  prepareInterview(input: InterviewPrepInput): Promise<string>;
  startMockVideoInterview(input: MockVideoInterviewStartInput): Promise<MockVideoInterviewSession>;
  evaluateMockVideoInterview(input: MockVideoInterviewEvaluateInput): Promise<MockVideoInterviewEvaluation>;
}
