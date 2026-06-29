/** 投递看板行业分类 — 解析与筛选共用 */

export const APPLICATION_INDUSTRIES = [
  "PE",
  "VC",
  "ECM",
  "DCM",
  "投行 IBD",
  "二级研究",
  "银行",
  "资管",
  "战略咨询",
  "管理咨询",
  "四大咨询",
  "咨询",
  "AI产品",
  "互联网产品",
  "互联网商分",
  "软件工程",
  "算法 / 数据",
  "产品经理",
  "市场 / 运营",
  "设计",
  "硬件 / 半导体",
  "生物 / 医疗",
  "能源 / 新能源",
  "其他",
] as const;

export type ApplicationIndustry = (typeof APPLICATION_INDUSTRIES)[number];

/** 从 JD 文本启发式推断行业 */
export function inferIndustryFromText(text: string): string | undefined {
  const lower = text.toLowerCase();

  if (/\bpe\b|私募股权|private\s*equity/i.test(text)) return "PE";
  if (/\bvc\b|风险投资|venture\s*capital|创投/i.test(text)) return "VC";
  if (/\becm\b|股权资本|equity\s*capital\s*market|股票发行|承销/i.test(text)) return "ECM";
  if (/\bdcm\b|债务资本|debt\s*capital|债券发行|固定收益/i.test(text)) return "DCM";
  if (/(ibd|investment\s*bank|投行|并购|m&a|并购重组)/i.test(text)) return "投行 IBD";
  if (/(equity\s*research|行业研究|二级研究|卖方研究|buy.?side)/i.test(text)) return "二级研究";
  if (/(commercial\s*bank|商业银行|零售银行|对公)/i.test(text)) return "银行";
  if (/(asset\s*management|资管|基金管理|fund\s*manager)/i.test(text)) return "资管";

  if (/(mckinsey|bcg|bain|麦肯锡|贝恩|波士顿|战略咨询|strategy\s*consult)/i.test(text))
    return "战略咨询";
  if (/(management\s*consult|管理咨询)/i.test(text)) return "管理咨询";
  if (/(deloitte|pwc|ey|kpmg|德勤|普华|安永|毕马威|四大)/i.test(text)) return "四大咨询";
  if (/(consult|consulting|咨询顾问|咨询)/i.test(text)) return "咨询";

  if (/(ai\s*product|ai产品|大模型产品|llm\s*product|aigc\s*产品)/i.test(lower)) return "AI产品";
  if (/(商业分析|business\s*analyst|商分|经营分析|da\b|data\s*analyst)/i.test(lower))
    return "互联网商分";
  if (/(product\s*manager|产品经理|\bpm\b)/i.test(lower) && /ai|大模型|llm/i.test(lower))
    return "AI产品";
  if (/(product\s*manager|产品经理|\bpm\b)/i.test(lower)) return "互联网产品";
  if (/(software|engineer|developer|后端|前端|fullstack|sde|研发)/i.test(lower)) return "软件工程";
  if (/(algorithm|ml|machine\s*learning|算法|数据科学|data\s*scientist)/i.test(lower))
    return "算法 / 数据";
  if (/(market|brand|growth|运营|用户增长)/i.test(lower)) return "市场 / 运营";
  if (/(design|ux|ui|交互|视觉)/i.test(lower)) return "设计";
  if (/(chip|semiconductor|hardware|射频|嵌入式)/i.test(lower)) return "硬件 / 半导体";
  if (/(biotech|pharma|生物|医药|医疗)/i.test(lower)) return "生物 / 医疗";
  if (/(energy|新能源|光伏|储能)/i.test(lower)) return "能源 / 新能源";

  return undefined;
}

/** 将旧数据或自由文本归一化到列表内 */
export function normalizeIndustry(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const v = value.trim();
  if ((APPLICATION_INDUSTRIES as readonly string[]).includes(v)) return v;

  const lower = v.toLowerCase();
  const aliases: Record<string, string> = {
    "金融 / 投资": "资管",
    "金融 / 银行": "银行",
    "咨询": "咨询",
    "互联网 / 软件": "软件工程",
    "数据 / 算法": "算法 / 数据",
    "产品": "互联网产品",
    "市场 / 品牌": "市场 / 运营",
    "研究": "二级研究",
    "媒体 / 文娱": "市场 / 运营",
    "AI Product": "AI产品",
    "AI product": "AI产品",
  };
  if (aliases[v]) return aliases[v];

  for (const ind of APPLICATION_INDUSTRIES) {
    if (lower.includes(ind.toLowerCase()) || ind.toLowerCase().includes(lower)) return ind;
  }
  // 收敛未知值，避免旧脏数据/乱码直接透出到 UI。
  return "其他";
}
