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
  // 提取 eyebrow 末段（去掉 "02 · APPLICATIONS" 这种"编号 · 英文"，留中文）
  const cleanEyebrow = eyebrow?.replace(/^[\d\s·\-]+/, "").replace(/^[A-Z\s]+·\s*/i, "");
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {cleanEyebrow && (
          <div className="text-[12px] text-ink-400 font-medium mb-1.5">{cleanEyebrow}</div>
        )}
        <h1 className="display-1 break-words">{title}</h1>
        {subtitle && (
          <p className="mt-2 text-ink-500 text-[14px] leading-relaxed max-w-2xl break-words">
            {subtitle}
          </p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
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
