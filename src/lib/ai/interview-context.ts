import type { Application } from "../types";
import type { InterviewPrepInput } from "./types";

export interface InterviewContextBundle extends InterviewPrepInput {
  contextText: string;
}

/** 把 AI 解析过的 JD / 简历 / 面经拼成统一上下文 */
export function buildInterviewContext(input: InterviewPrepInput): InterviewContextBundle {
  const { application, profileDocs = [], profileEntries = [], sharedExperiences } = input;
  const lines: string[] = [
    `# 目标岗位`,
    `- 公司：${application.company}`,
    `- 岗位：${application.role}`,
    `- 行业：${application.industry ?? "—"}`,
    `- 地点：${application.location ?? "—"}`,
    `- JD 摘要：${application.jdSummary ?? "—"}`,
    `- JD 关键词：${(application.keywords ?? []).join("、") || "—"}`,
  ];

  if (profileEntries.length) {
    lines.push("", `# 候选人 Profile 条目（已结构化）`);
    for (const e of profileEntries.slice(0, 12)) {
      lines.push(
        `## [${e.module}] ${e.title}`,
        e.org ? `- 组织：${e.org}` : "",
        e.role ? `- 角色：${e.role}` : "",
        e.summary ? `- 摘要：${e.summary}` : "",
        e.bullets?.length ? `- bullets：${e.bullets.slice(0, 4).join("；")}` : "",
      );
    }
  }

  if (profileDocs.length) {
    lines.push("", `# 候选人文档`);
    for (const d of profileDocs.slice(0, 4)) {
      const skills = d.structured?.skills?.slice(0, 8).join("、");
      lines.push(
        `## ${d.title} (${d.kind})`,
        d.structured?.summary ? `摘要：${d.structured.summary}` : "",
        skills ? `技能：${skills}` : "",
        `正文摘录：${d.content.slice(0, 600)}`,
      );
    }
  }

  if (sharedExperiences.length) {
    lines.push("", `# 面经参考`);
    for (const e of sharedExperiences.slice(0, 8)) {
      lines.push(
        `- ${e.company} / ${e.role ?? "?"} / ${e.stage ?? "面经"}`,
        e.highlights?.length ? `  高频：${e.highlights.slice(0, 5).join("；")}` : "",
        `  摘录：${e.content.slice(0, 300)}`,
      );
    }
  }

  return {
    ...input,
    contextText: lines.filter(Boolean).join("\n"),
  };
}

export function formatApplicationHeader(app: Application): string {
  return `${app.company} · ${app.role}`;
}
