"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="surface p-8 max-w-lg mx-auto mt-16 text-center space-y-4">
      <div className="text-[12px] text-ink-400">出错了</div>
      <h2 className="text-xl font-semibold text-ink-800">页面加载失败</h2>
      <p className="text-sm text-ink-500 break-words">{error.message || "未知错误"}</p>
      <div className="flex items-center justify-center gap-2 pt-2">
        <button type="button" className="btn-primary" onClick={() => reset()}>
          重试
        </button>
        <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>
          刷新页面
        </button>
      </div>
    </div>
  );
}
