import Link from "next/link";
import { listApplications, getStats } from "@/lib/repo";
import { SectionTitle, StatusPill, STATUS_LABEL } from "@/components/ui";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const apps = listApplications();
  const stats = getStats();
  const recent = apps.slice(0, 5);
  const upcoming = stats.upcoming as unknown as {
    id: string;
    company: string;
    role: string;
    application_id: string;
    round: number;
    kind: string;
    scheduled_at: string;
  }[];
  const counts = Object.fromEntries(stats.counts.map((c) => [c.status, c.n])) as Record<string, number>;

  return (
    <div>
      <SectionTitle
        eyebrow="概览"
        title="把每一份投递，沉淀成可复用的资产。"
        subtitle="解析 JD、记录每一轮面试、围绕你的经历做检索与重写 — 用最少的字段，承载最大的信息密度。"
        right={
          <div className="flex gap-2">
            <Link className="btn-ghost" href="/profile">
              个人资料
            </Link>
            <Link className="btn-primary" href="/applications">
              进入看板
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {APPLICATION_STATUSES.map((s) => (
          <Link
            href={`/applications?status=${s}`}
            key={s}
            className="surface p-4 hover:border-ink-200 transition"
          >
            <div className="label-eyebrow">{STATUS_LABEL[s as ApplicationStatus]}</div>
            <div className="mt-2 font-serif text-3xl text-ink-800">{counts[s] ?? 0}</div>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6 mt-10">
        <section className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display-2">最近的投递</h2>
            <Link href="/applications" className="link text-sm">
              全部 →
            </Link>
          </div>
          {recent.length === 0 ? (
            <p className="text-ink-300 text-sm">还没有投递记录。从 解析新岗位 开始。</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {recent.map((a) => (
                <li key={a.id} className="py-3 flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <Link
                      href={`/applications/${a.id}`}
                      className="text-ink-800 font-medium hover:text-clay-500 truncate block"
                    >
                      {a.company} · {a.role}
                    </Link>
                    <div className="text-xs text-ink-400 mt-0.5">
                      {a.location ?? "—"} · {a.deadline ? `截止 ${a.deadline}` : "无截止"}
                    </div>
                  </div>
                  <StatusPill status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="surface p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="display-2">即将到来的面试</h2>
            <span className="label-eyebrow">UPCOMING</span>
          </div>
          {upcoming.length === 0 ? (
            <p className="text-ink-300 text-sm">尚未安排任何面试。在投递详情页可以新增。</p>
          ) : (
            <ul className="divide-y divide-ink-100">
              {upcoming.map((u) => (
                <li key={u.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/applications/${u.application_id}`}
                      className="text-ink-800 font-medium hover:text-clay-500 truncate block"
                    >
                      {u.company} · {u.role}
                    </Link>
                    <div className="text-xs text-ink-400 mt-0.5">
                      第 {u.round} 轮 · {u.kind} · {new Date(u.scheduled_at).toLocaleString()}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-10 surface-quiet p-6 flex flex-wrap gap-6 items-center justify-between">
        <div>
          <div className="label-eyebrow">AI 功能</div>
          <p className="mt-2 text-ink-500">
            可在设置页管理 AI 接入。JD 解析、简历优化、面试准备都会自动使用你当前配置的模型。
          </p>
        </div>
        <Link href="/settings" className="btn-accent">
          打开设置
        </Link>
      </section>
    </div>
  );
}
