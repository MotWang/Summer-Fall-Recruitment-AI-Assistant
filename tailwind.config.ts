import type { Config } from "tailwindcss";

/**
 * Anthropic 风格设计 token：
 *  - 温暖中性的米色背景 (Ivory) 取代纯白
 *  - 暖陶土橙作为唯一强调色 (Clay)
 *  - 深炭灰文字 (Ink) 替代纯黑，降低对比度
 *  - 大量留白、低密度、单色系点缀
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx,md,mdx}"],
  theme: {
    extend: {
      colors: {
        ivory: {
          50: "#FBFAF5",
          100: "#F5F4ED",
          200: "#EDEBE0",
          300: "#E2DFD0",
          400: "#CFCAB6",
        },
        ink: {
          50: "#F7F6F2",
          100: "#E8E6DE",
          200: "#C9C6BC",
          300: "#9A968B",
          400: "#6A675F",
          500: "#3F3D38",
          600: "#2C2A26",
          700: "#1F1E1B",
          800: "#141311",
          900: "#0A0908",
        },
        clay: {
          50: "#FBF1EC",
          100: "#F4DCCF",
          200: "#E9B79E",
          300: "#DC9170",
          400: "#CC785C",
          500: "#B5604A",
          600: "#964B3A",
          700: "#723829",
        },
      },
      fontFamily: {
        sans: [
          "ui-sans-serif",
          "-apple-system",
          "BlinkMacSystemFont",
          "'Inter'",
          "'PingFang SC'",
          "'Hiragino Sans GB'",
          "sans-serif",
        ],
        serif: [
          "'Tiempos Headline'",
          "'GT Sectra'",
          "Georgia",
          "'Songti SC'",
          "serif",
        ],
        mono: ["'JetBrains Mono'", "ui-monospace", "monospace"],
      },
      letterSpacing: {
        tightish: "-0.012em",
      },
      boxShadow: {
        soft: "0 1px 0 0 rgba(31, 30, 27, 0.04), 0 8px 24px -12px rgba(31, 30, 27, 0.12)",
        ring: "0 0 0 1px rgba(31, 30, 27, 0.08)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};

export default config;
