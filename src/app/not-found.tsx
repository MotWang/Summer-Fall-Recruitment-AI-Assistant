import Link from "next/link";

export default function NotFound() {
  return (
    <div className="py-20 text-center">
      <div className="label-eyebrow">404</div>
      <h1 className="display-1 mt-3">这里什么都没有。</h1>
      <p className="text-ink-400 mt-2">页面可能被删除，或链接已失效。</p>
      <Link href="/" className="btn-primary mt-6 inline-flex">回到概览</Link>
    </div>
  );
}
