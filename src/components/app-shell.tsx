"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const NAV = [
  { href: "/", label: "概览", eyebrow: "01" },
  { href: "/applications", label: "投递看板", eyebrow: "02" },
  { href: "/profile", label: "个人资料", eyebrow: "03" },
  { href: "/experiences", label: "面经库", eyebrow: "04" },
];

const SETTINGS_NAV = { href: "/settings", label: "设置", eyebrow: "⚙" };

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen flex">
      <aside className="hidden md:flex w-[224px] shrink-0 flex-col border-r border-ink-100 px-5 py-6 bg-ivory-50/50">
        <div className="flex items-center gap-2.5">
          <span className="h-8 w-8 rounded-[10px] bg-clay-400 text-ivory-50 flex items-center justify-center text-base font-semibold">
            R
          </span>
          <div className="leading-tight">
            <div className="text-[15px] font-semibold text-ink-800">投递助手</div>
            <div className="text-[11px] text-ink-400">2027 Summer · Fall</div>
          </div>
        </div>

        <nav className="mt-10 flex flex-col gap-1">
          {NAV.map((n) => {
            const active =
              n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "group flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "text-ink-800 bg-ivory-200"
                    : "text-ink-400 hover:text-ink-700 hover:bg-ivory-100",
                )}
              >
                <span
                  className={clsx(
                    "text-[10px] tracking-widest",
                    active ? "text-clay-500" : "text-ink-200",
                  )}
                >
                  {n.eyebrow}
                </span>
                <span>{n.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto pt-6 space-y-3">
          <Link
            href={SETTINGS_NAV.href}
            className={clsx(
              "group flex items-baseline gap-3 rounded-lg px-3 py-2 text-sm transition",
              pathname.startsWith(SETTINGS_NAV.href)
                ? "text-ink-800 bg-ivory-200"
                : "text-ink-400 hover:text-ink-700 hover:bg-ivory-100",
            )}
          >
            <span
              className={clsx(
                "text-[12px]",
                pathname.startsWith(SETTINGS_NAV.href) ? "text-clay-500" : "text-ink-200",
              )}
            >
              {SETTINGS_NAV.eyebrow}
            </span>
            <span>{SETTINGS_NAV.label}</span>
          </Link>
          <div className="text-[11px] text-ink-300 leading-relaxed">
            <p>
              数据保存在本地 SQLite。
              <Link className="link" href="/api/export">
                导出 JSON
              </Link>
            </p>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <div className="md:hidden border-b border-ink-100 px-5 py-3 flex items-center gap-2.5">
          <span className="h-7 w-7 rounded-[8px] bg-clay-400 text-ivory-50 flex items-center justify-center text-sm font-semibold">
            R
          </span>
          <span className="text-[15px] font-semibold text-ink-800">投递助手</span>
        </div>
        <div className="md:hidden border-b border-ink-100 px-5 py-2 overflow-x-auto">
          <div className="flex gap-3 text-sm">
            {[...NAV, SETTINGS_NAV].map((n) => {
              const active =
                n.href === "/" ? pathname === "/" : pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  className={clsx(
                    "whitespace-nowrap py-1",
                    active ? "text-ink-800 underline decoration-clay-400 underline-offset-4" : "text-ink-400",
                  )}
                >
                  {n.label}
                </Link>
              );
            })}
          </div>
        </div>
        <div className="px-5 md:px-10 py-6 md:py-10 max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
