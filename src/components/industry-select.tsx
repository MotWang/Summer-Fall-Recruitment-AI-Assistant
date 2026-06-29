import { APPLICATION_INDUSTRIES } from "@/lib/industries";

export function IndustrySelect({
  value,
  onChange,
  className,
  allowEmpty,
}: {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  allowEmpty?: boolean;
}) {
  return (
    <select
      className={className ?? "input"}
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {allowEmpty && <option value="">— 未分类 —</option>}
      {!allowEmpty && !value && <option value="">选择行业…</option>}
      {APPLICATION_INDUSTRIES.map((ind) => (
        <option key={ind} value={ind}>
          {ind}
        </option>
      ))}
      {value && !(APPLICATION_INDUSTRIES as readonly string[]).includes(value) && (
        <option value={value}>{value}（自定义）</option>
      )}
    </select>
  );
}
