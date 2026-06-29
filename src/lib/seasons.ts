// 季节推断 — 用于把 JD 文本启发式分到 summer/fall/spring/daily/other/""
import type { Season } from "./types";

const PATTERNS: Array<{ season: Exclude<Season, "">; re: RegExp }> = [
  { season: "summer-2027", re: /(?:summer\s*intern|暑期实习|暑期\s*intern|2027\s*暑期|summer\s*2027|暑假实习|暑实)/i },
  { season: "fall-2026", re: /(?:秋招|校招|fall\s*recruitment|2026\s*秋招|2027届|class\s*of\s*2027|graduate\s*program|new\s*grad)/i },
  { season: "spring-2027", re: /(?:春招|spring\s*recruitment|春季招聘|补录)/i },
  { season: "daily", re: /(?:日常实习|long[-\s]?term\s*intern|full[-\s]?time\s*intern|全职实习|长期实习|社招|social\s*recruit)/i },
];

/**
 * 从 JD 原文里推断招聘季节。
 * 推断不出 → 返回空字符串（""），由用户在 UI 里手动选择。
 */
export function inferSeason(text: string): Season {
  if (!text) return "";
  for (const p of PATTERNS) {
    if (p.re.test(text)) return p.season;
  }
  // 兜底：根据明显的"2027 暑期 / 2026 秋"年份+季节组合
  if (/2027/.test(text) && /(暑期|summer|intern)/i.test(text)) return "summer-2027";
  if (/2026/.test(text) && /(秋|fall)/i.test(text)) return "fall-2026";
  return "";
}
