import clsx from "clsx";
import type { ApplicationStatus } from "@/lib/types";

export const STATUS_LABEL: Record<ApplicationStatus, string> = {
  wishlist: "未投递",
  applied: "已投递",
  om_assessment: "OA / 笔试",
  interviewing: "面试中",
  offer: "Offer",
  rejected: "已挂",
  withdrawn: "已撤回",
};

export function StatusPill({ status }: { status: ApplicationStatus }) {
  return (
    <span className={clsx("pill", `status-${status}`)}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {STATUS_LABEL[status]}
    </span>
  );
}

export function SectionTitle({
  eyebrow,
  title,
  subtitle,
  right,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  right?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-6 mb-8 border-b border-ink-100 pb-6">
      <div>
        {eyebrow && <div className="label-eyebrow mb-3">{eyebrow}</div>}
        <h1 className="display-1">{title}</h1>
        {subtitle && <p className="mt-3 text-ink-400 max-w-2xl">{subtitle}</p>}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="surface-quiet p-10 text-center">
      <div className="display-2 text-ink-500">{title}</div>
      {hint && <p className="mt-3 text-ink-400 text-sm">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
