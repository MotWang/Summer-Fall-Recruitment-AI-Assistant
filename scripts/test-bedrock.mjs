// 验证 Bedrock 连通性：npx tsx scripts/test-bedrock.mjs
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnv() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const m = line.match(/^([A-Z_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
    }
  } catch {
    // ignore
  }
}

loadEnv();

const { bedrockConverse } = await import("../src/lib/ai/bedrock-client.ts");

try {
  const out = await bedrockConverse({ user: "Reply with the word: pong", maxTokens: 32 });
  console.log("OK:", out);
} catch (e) {
  console.error("FAIL:", e.message);
  process.exit(1);
}
