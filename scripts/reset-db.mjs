import fs from "node:fs";
import path from "node:path";
import url from "node:url";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const dbPath = process.env.RECRUIT_DB_PATH || path.join(__dirname, "..", "data", "recruit.db");
for (const p of [dbPath, dbPath + "-journal", dbPath + "-wal", dbPath + "-shm"]) {
  if (fs.existsSync(p)) {
    fs.unlinkSync(p);
    console.log("removed", p);
  }
}
console.log("ok.");
