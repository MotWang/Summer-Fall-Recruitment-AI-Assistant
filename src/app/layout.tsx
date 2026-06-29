import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getAppSettings } from "@/lib/repo";

export const metadata: Metadata = {
  title: "Recruit Copilot · 2027 Summer & Fall",
  description: "本地优先的投递、面试、简历与面经助手",
};

// 服务端读取 settings，在 SSR 阶段就把 data-theme / data-accent 写到 <html>，
// 避免客户端 hydration 时主题闪烁。
function readThemeAttrs() {
  try {
    const s = getAppSettings();
    return { theme: s.theme ?? "light", accent: s.accent ?? "clay" };
  } catch {
    return { theme: "light" as const, accent: "clay" as const };
  }
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { theme, accent } = readThemeAttrs();
  return (
    <html lang="zh-CN" data-theme={theme === "system" ? "light" : theme} data-accent={accent}>
      <head>
        {/* 系统模式下用 prefers-color-scheme 同步覆盖（在 React hydrate 前先跑） */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=${JSON.stringify(theme)};if(t==='system'){var d=window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.dataset.theme=d?'dark':'light';}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-screen">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
