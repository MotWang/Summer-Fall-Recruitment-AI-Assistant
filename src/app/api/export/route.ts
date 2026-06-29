import { exportAll } from "@/lib/repo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const data = exportAll();
  return new Response(JSON.stringify(data, null, 2), {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "content-disposition": `attachment; filename="recruit-copilot-${new Date()
        .toISOString()
        .slice(0, 10)}.json"`,
    },
  });
}
