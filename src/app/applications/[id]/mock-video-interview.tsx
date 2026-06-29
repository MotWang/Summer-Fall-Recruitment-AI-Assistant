"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import type { Application } from "@/lib/types";
import type {
  MockVideoInterviewEvaluation,
  MockVideoInterviewSession,
} from "@/lib/ai/types";
import { Markdown } from "@/components/markdown";

type Phase = "idle" | "starting" | "interview" | "evaluating" | "done";

export function MockVideoInterviewPanel({ app }: { app: Application }) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [session, setSession] = useState<MockVideoInterviewSession | null>(null);
  const [artifactId, setArtifactId] = useState<string | null>(null);
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [evaluation, setEvaluation] = useState<MockVideoInterviewEvaluation | null>(null);
  const [reportMd, setReportMd] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const questions = session?.questions ?? [];
  const current = questions[idx];

  const progress = useMemo(() => {
    if (!questions.length) return 0;
    return Math.round(((idx + 1) / questions.length) * 100);
  }, [idx, questions.length]);

  async function start() {
    if (phase === "starting" || phase === "evaluating") return; // 防重入
    setPhase("starting");
    setMsg("正在根据 JD 与 Profile 生成面试题…");
    try {
      const r = await fetch("/api/ai/mock-interview/start", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ applicationId: app.id, round: 1, kind: "technical" }),
      });
      const j = await r.json();
      if (!j.ok) {
        setMsg(`失败：${j.error}`);
        setPhase("idle");
        return;
      }
      setSession(j.data.session);
      setArtifactId(j.data.artifact?.id ?? null);
      setAnswers({});
      setIdx(0);
      setEvaluation(null);
      setReportMd("");
      setPhase("interview");
      setMsg(null);
    } catch (e) {
      setMsg(`失败：${(e as Error).message}`);
      setPhase("idle");
    }
  }

  function setAnswer(text: string) {
    if (!current) return;
    setAnswers((prev) => ({ ...prev, [current.id]: text }));
  }

  function next() {
    if (idx < questions.length - 1) setIdx((i) => i + 1);
  }

  function prev() {
    if (idx > 0) setIdx((i) => i - 1);
  }

  async function submitEvaluate() {
    if (!session) return;
    setPhase("evaluating");
    setMsg("AI 正在评估你的回答…");
    const payload = {
      applicationId: app.id,
      sessionArtifactId: artifactId ?? undefined,
      session,
      answers: questions.map((q) => ({
        questionId: q.id,
        transcript: answers[q.id] ?? "",
      })),
    };
    const r = await fetch("/api/ai/mock-interview/evaluate", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await r.json();
    if (!j.ok) {
      setMsg(`评估失败：${j.error}`);
      setPhase("interview");
      return;
    }
    setEvaluation(j.data.evaluation);
    setReportMd(j.data.reportMarkdown ?? "");
    setPhase("done");
    setMsg(null);
  }

  return (
    <section className="surface p-6 space-y-4 border border-clay-200/60 bg-clay-50/20">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="label-eyebrow">Mock Interview · Video 1-on-1</div>
          <h3 className="display-2 mt-1">AI 模拟视频面试（1v1）</h3>
          <p className="text-sm text-ink-500 mt-2 max-w-xl">
            当前为 Video 交互预演版：界面按 1v1 视频面试设计，实时音视频接口可在后续无缝接入；你现在可先用文本作答并获得结构化反馈。
          </p>
        </div>
        {phase === "idle" || phase === "done" || phase === "starting" ? (
          <button className="btn-accent" onClick={start} disabled={phase === "starting"}>
            {phase === "starting"
              ? "生成中…"
              : phase === "done"
              ? "再来一轮"
              : "开始模拟面试"}
          </button>
        ) : null}
      </header>

      {msg && <p className="text-xs text-ink-400">{msg}</p>}

      <div className="grid sm:grid-cols-2 gap-3">
        <div className="surface-quiet p-4 min-h-[140px]">
          <div className="text-[11px] text-ink-400 mb-2">面试官画面（待接入 RTC）</div>
          <div className="h-[88px] rounded-lg bg-ink-100/70 flex items-center justify-center text-xs text-ink-400">
            Interviewer Video Placeholder
          </div>
        </div>
        <div className="surface-quiet p-4 min-h-[140px]">
          <div className="text-[11px] text-ink-400 mb-2">候选人画面（待接入摄像头）</div>
          <div className="h-[88px] rounded-lg bg-ink-100/70 flex items-center justify-center text-xs text-ink-400">
            Candidate Video Placeholder
          </div>
        </div>
      </div>

      {phase === "interview" && session && current && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-xs text-ink-400">
            <span>
              第 {idx + 1} / {questions.length} 题
            </span>
            <div className="flex-1 h-1.5 bg-ivory-200 rounded-full overflow-hidden">
              <div className="h-full bg-clay-400 transition-all" style={{ width: `${progress}%` }} />
            </div>
            <span>{current.timeLimitSec}s 建议</span>
          </div>

          <div className="surface-quiet p-4 space-y-2">
            <div className="text-xs text-clay-600 font-medium">面试官</div>
            <p className="text-ink-800 leading-relaxed">{current.prompt}</p>
            {current.probeHints?.length ? (
              <p className="text-xs text-ink-400">可能的追问：{current.probeHints.join(" / ")}</p>
            ) : null}
          </div>

          <label className="block">
            <div className="field-label mb-1">你的回答（当前为文本输入，后续可切语音转写）</div>
            <textarea
              className="textarea min-h-[140px]"
              placeholder="按视频面试口语节奏回答，建议 3-6 句话，使用 STAR。"
              value={answers[current.id] ?? ""}
              onChange={(e) => setAnswer(e.target.value)}
            />
          </label>

          <div className="flex flex-wrap gap-2">
            <button className="btn-ghost" onClick={prev} disabled={idx === 0}>
              上一题
            </button>
            {idx < questions.length - 1 ? (
              <button className="btn-primary" onClick={next}>
                下一题
              </button>
            ) : (
              <button className="btn-accent" onClick={submitEvaluate}>
                提交并评估
              </button>
            )}
          </div>
        </div>
      )}

      {phase === "evaluating" && (
        <p className="text-sm text-ink-500">评估中，请稍候…</p>
      )}

      {phase === "done" && evaluation && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <ScoreCard label="综合得分" value={`${evaluation.overallScore}`} highlight />
            <ScoreCard label="通过可能性" value={evaluation.passLikelihood} />
            <ScoreCard label="相关性" value={`${evaluation.dimensions.relevance}`} />
            <ScoreCard label="结构" value={`${evaluation.dimensions.structure}`} />
            <ScoreCard label="深度" value={`${evaluation.dimensions.depth}`} />
            <ScoreCard label="岗位匹配" value={`${evaluation.dimensions.roleFit}`} />
          </div>
          {reportMd ? <Markdown source={reportMd} /> : null}
        </div>
      )}
    </section>
  );
}

function ScoreCard({
  label,
  value,
  highlight,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-3 py-2",
        highlight ? "border-clay-300 bg-clay-50" : "border-ink-100 bg-ivory-50",
      )}
    >
      <div className="text-[10px] uppercase tracking-wider text-ink-400">{label}</div>
      <div className={clsx("font-serif text-xl mt-0.5", highlight ? "text-clay-600" : "text-ink-800")}>
        {value}
      </div>
    </div>
  );
}
