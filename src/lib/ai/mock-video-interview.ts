import { randomUUID } from "node:crypto";
import { buildInterviewContext } from "./interview-context";
import type {
  MockInterviewQuestion,
  MockVideoInterviewEvaluateInput,
  MockVideoInterviewEvaluation,
  MockVideoInterviewSession,
  MockVideoInterviewStartInput,
} from "./types";

function qid(order: number): string {
  return `q${order}`;
}

export function startMockVideoInterviewHeuristic(
  input: MockVideoInterviewStartInput,
): MockVideoInterviewSession {
  const { application, sharedExperiences } = input;
  const bundle = buildInterviewContext(input);
  const keywords = application.keywords ?? [];
  const highlights = sharedExperiences
    .filter((e) => e.company.toLowerCase() === application.company.toLowerCase())
    .flatMap((e) => e.highlights ?? [])
    .slice(0, 6);

  const techQ = keywords.find((k) => /python|java|sql|ml|算法|数据|产品|设计/i.test(k));
  const behavioralQ = highlights[0] ?? `请结合经历说明你为什么适合 ${application.role}`;

  const questions: MockInterviewQuestion[] = [
    {
      id: qid(1),
      order: 1,
      category: "opening",
      prompt: `你好，我是 ${application.company} 的面试官。请先做一个 1–2 分钟的自我介绍，重点说明你与「${application.role}」相关的经历。`,
      timeLimitSec: 120,
      evaluationRubric: "结构清晰、与岗位相关、控制在 2 分钟内、有量化成果",
    },
    {
      id: qid(2),
      order: 2,
      category: "behavioral",
      prompt: `为什么想加入 ${application.company}？为什么是这个岗位？`,
      timeLimitSec: 90,
      evaluationRubric: "动机真实、体现对公司/岗位的理解、与 JD 关键词呼应",
      probeHints: ["如果只能选一个原因，你会选什么？"],
    },
    {
      id: qid(3),
      order: 3,
      category: "behavioral",
      prompt: behavioralQ.includes("?") ? behavioralQ : `请用 STAR 法则回答：${behavioralQ}`,
      timeLimitSec: 180,
      evaluationRubric: "STAR 完整、有具体行动与结果、可量化",
      probeHints: ["你个人具体负责哪一部分？", "如果重来你会怎么改进？"],
    },
    {
      id: qid(4),
      order: 4,
      category: techQ ? "technical" : "case",
      prompt: techQ
        ? `JD 提到「${techQ}」。请结合你的项目经历，说明你是如何应用它的，遇到了什么难点？`
        : `假设你需要在 ${application.industry ?? "该行业"} 场景下推进一个与「${keywords[0] ?? application.role}」相关的项目，你会如何拆解问题？`,
      timeLimitSec: 180,
      evaluationRubric: "技术/业务理解准确、思路结构化、能落到个人贡献",
    },
    {
      id: qid(5),
      order: 5,
      category: "culture",
      prompt: "你如何处理与队友意见不一致的情况？请举一个真实例子。",
      timeLimitSec: 120,
      evaluationRubric: "沟通方式成熟、有冲突解决过程、体现协作",
    },
    {
      id: qid(6),
      order: 6,
      category: "closing",
      prompt: "你有什么想问我们的吗？（模拟反向提问环节）",
      timeLimitSec: 60,
      evaluationRubric: "问题有深度、与岗位/团队相关、体现思考",
    },
  ];

  return {
    sessionId: randomUUID(),
    company: application.company,
    role: application.role,
    interviewKind: input.interviewKind ?? "technical",
    round: input.round ?? 1,
    interviewerPersona: `${application.company} ${application.role} 面试官 · 专业、友好、会追问细节`,
    openingScript: `欢迎参加 ${application.company} 第 ${input.round ?? 1} 轮模拟视频面试。我是今天的面试官，接下来会按顺序提问，请像真实面试一样作答。`,
    questions,
    closingScript: "感谢你的时间。我们会在评估后给出反馈，祝你准备顺利。",
    contextSummary: bundle.contextText.slice(0, 800),
  };
}

function scoreAnswer(
  transcript: string,
  question: MockInterviewQuestion,
  keywords: string[],
): { score: number; strengths: string[]; improvements: string[] } {
  const text = transcript.trim();
  const len = text.length;
  const strengths: string[] = [];
  const improvements: string[] = [];
  let score = 45;

  if (len >= 80) {
    score += 15;
    strengths.push("回答有一定篇幅，信息较完整");
  } else if (len >= 30) {
    score += 5;
    improvements.push("回答偏短，可补充更多细节与例子");
  } else {
    improvements.push("回答过短，建议用 STAR 展开");
  }

  const kwHit = keywords.filter((k) => text.toLowerCase().includes(k.toLowerCase())).length;
  if (kwHit > 0) {
    score += Math.min(15, kwHit * 5);
    strengths.push(`呼应了 JD 关键词（${kwHit} 个）`);
  } else {
    improvements.push("可更多引用 JD 关键词，体现岗位匹配度");
  }

  if (/star|情境|任务|行动|结果|background|action|result/i.test(text)) {
    score += 10;
    strengths.push("使用了结构化表达（如 STAR）");
  }

  if (/\d+%|\d+万|\d+倍|提升|降低|增长/i.test(text)) {
    score += 10;
    strengths.push("包含量化或结果描述");
  } else {
    improvements.push("尽量补充量化结果（数字、百分比、影响范围）");
  }

  if (question.category === "closing" && /\?|吗|什么|如何|why|what|how/i.test(text)) {
    score += 8;
    strengths.push("提出了反向问题，体现主动性");
  }

  return {
    score: Math.min(100, Math.max(0, score)),
    strengths,
    improvements,
  };
}

export function evaluateMockVideoInterviewHeuristic(
  input: MockVideoInterviewEvaluateInput,
): MockVideoInterviewEvaluation {
  const { application, session, answers } = input;
  const keywords = application.keywords ?? [];
  const byId = new Map(answers.map((a) => [a.questionId, a]));

  const questionEvaluations = session.questions.map((q) => {
    const ans = byId.get(q.id);
    const transcript = ans?.transcript ?? "";
    const { score, strengths, improvements } = scoreAnswer(transcript, q, keywords);
    return {
      questionId: q.id,
      score,
      strengths: strengths.length ? strengths : ["完成了该题作答"],
      improvements: improvements.length ? improvements : ["可进一步结合个人经历深化"],
      sampleAnswerOutline: `针对「${q.prompt.slice(0, 40)}…」：情境 → 你的任务 → 具体行动 → 量化结果`,
    };
  });

  const avg =
    questionEvaluations.reduce((s, e) => s + e.score, 0) /
    Math.max(1, questionEvaluations.length);

  const relevance = Math.round(avg);
  const structure = Math.round(
    questionEvaluations.filter((e) => e.strengths.some((s) => s.includes("STAR"))).length *
      (100 / Math.max(1, session.questions.length)) +
      avg * 0.3,
  );
  const depth = Math.round(avg * 0.95);
  const communication = Math.round(avg * 0.9);
  const roleFit = Math.round(
    keywords.length
      ? Math.min(100, avg + questionEvaluations.filter((e) => e.score > 60).length * 3)
      : avg,
  );

  const overallScore = Math.round(
    relevance * 0.25 + structure * 0.2 + depth * 0.2 + communication * 0.15 + roleFit * 0.2,
  );

  const passLikelihood: MockVideoInterviewEvaluation["passLikelihood"] =
    overallScore >= 75 ? "high" : overallScore >= 55 ? "medium" : "low";

  const topImprovements = [
    ...new Set(questionEvaluations.flatMap((e) => e.improvements)),
  ].slice(0, 5);

  return {
    sessionId: session.sessionId,
    overallScore,
    dimensions: { relevance, structure, depth, communication, roleFit },
    questionEvaluations,
    summary:
      overallScore >= 75
        ? `整体表现较好，与 ${application.company} · ${application.role} 的匹配度较高。`
        : overallScore >= 55
          ? `具备基础回答能力，建议在深度、量化与岗位关键词覆盖上继续加强。`
          : `当前回答偏简略或偏离要点，建议按 STAR 重写核心经历并对照 JD 关键词演练。`,
    topImprovements,
    passLikelihood,
  };
}

export function evaluationToMarkdown(
  evaluation: MockVideoInterviewEvaluation,
  session: MockVideoInterviewSession,
): string {
  const dim = evaluation.dimensions;
  return [
    `# Mock 视频面试评估 · ${session.company} · ${session.role}`,
    ``,
    `> 综合得分 **${evaluation.overallScore}/100** · 通过可能性：**${evaluation.passLikelihood}**`,
    ``,
    `## 维度得分`,
    `- 相关性：${dim.relevance}`,
    `- 结构：${dim.structure}`,
    `- 深度：${dim.depth}`,
    `- 表达：${dim.communication}`,
    `- 岗位匹配：${dim.roleFit}`,
    ``,
    `## 总评`,
    evaluation.summary,
    ``,
    `## 优先改进`,
    ...evaluation.topImprovements.map((t, i) => `${i + 1}. ${t}`),
    ``,
    `## 逐题反馈`,
    ...evaluation.questionEvaluations.map((e, i) => {
      const q = session.questions.find((x) => x.id === e.questionId);
      return [
        `### Q${i + 1} · ${e.score}/100`,
        q ? `**题目**：${q.prompt}` : "",
        `**亮点**：${e.strengths.join("；")}`,
        `**改进**：${e.improvements.join("；")}`,
        e.sampleAnswerOutline ? `**参考骨架**：${e.sampleAnswerOutline}` : "",
      ]
        .filter(Boolean)
        .join("\n");
    }),
  ].join("\n");
}
