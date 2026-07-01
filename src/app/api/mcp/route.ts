import { NextRequest } from "next/server";
import { ok, err, readJson } from "@/lib/http";
import { assertMcpAuth } from "@/lib/mcp-auth";
import { withUserContextAsync } from "@/lib/request-context";
import { ingestAndSaveJob, ingestJobDraft, type IngestInput } from "@/lib/ingest-job";
import {
  listApplications,
  getApplication,
  createApplication,
  updateApplication,
  createInterview,
  listInterviews,
  getInterview,
} from "@/lib/repo";
import { listCalendarEvents } from "@/lib/calendar";
import {
  googleCalendarStatus,
  syncInterviewsToGoogle,
  listGoogleCalendarEvents,
} from "@/lib/google-calendar";
import type { Application, Interview } from "@/lib/types";

export const runtime = "nodejs";

/** OpenClaw / 外部 Agent 统一 MCP REST 入口 */
export async function POST(req: NextRequest) {
  try {
    const userId = assertMcpAuth(req);
    return await withUserContextAsync(userId, async () => {
      const body = await readJson<{
        action: string;
        payload?: Record<string, unknown>;
      }>(req);

      const p = body.payload ?? {};

      switch (body.action) {
        case "ingest_preview": {
          const result = await ingestJobDraft(p as IngestInput);
          return ok(result);
        }
        case "ingest_and_save": {
          const result = await ingestAndSaveJob(p as IngestInput);
          return ok(result);
        }
        case "list_applications": {
          return ok(
            listApplications(userId, {
              status: p.status as Application["status"] | undefined,
              search: p.search as string | undefined,
            }),
          );
        }
        case "get_application": {
          const app = getApplication(userId, String(p.id ?? ""));
          if (!app) return err("application not found", 404);
          return ok({ ...app, interviews: listInterviews(userId, app.id) });
        }
        case "create_application": {
          if (!p.company || !p.role) return err("company 与 role 必填");
          const created = createApplication(userId, {
            ...(p as Partial<Application>),
            company: String(p.company),
            role: String(p.role),
          });
          return ok(created, { status: 201 });
        }
        case "update_application": {
          const updated = updateApplication(userId, String(p.id ?? ""), p as Partial<Application>);
          if (!updated) return err("application not found", 404);
          return ok(updated);
        }
        case "list_interviews": {
          return ok(
            listInterviews(userId, p.applicationId ? String(p.applicationId) : undefined),
          );
        }
        case "create_interview": {
          if (!p.applicationId) return err("applicationId 必填");
          const intv = createInterview(userId, {
            ...(p as Partial<Interview>),
            applicationId: String(p.applicationId),
          });
          return ok(intv, { status: 201 });
        }
        case "get_interview": {
          const intv = getInterview(userId, String(p.id ?? ""));
          if (!intv) return err("interview not found", 404);
          return ok(intv);
        }
        case "calendar_events": {
          return ok(
            listCalendarEvents(userId, {
              from: p.from ? String(p.from) : undefined,
              to: p.to ? String(p.to) : undefined,
            }),
          );
        }
        case "google_calendar_status": {
          return ok(googleCalendarStatus());
        }
        case "google_calendar_sync": {
          const status = googleCalendarStatus();
          if (!status.connected) return err("Google Calendar 未连接");
          const result = await syncInterviewsToGoogle();
          return ok(result);
        }
        case "google_calendar_list": {
          const status = googleCalendarStatus();
          if (!status.connected) return err("Google Calendar 未连接");
          const events = await listGoogleCalendarEvents({
            from: String(p.from ?? new Date().toISOString()),
            to: String(p.to ?? new Date(Date.now() + 30 * 864e5).toISOString()),
          });
          return ok(events);
        }
        case "capabilities": {
          return ok({
            actions: [
              "ingest_preview",
              "ingest_and_save",
              "list_applications",
              "get_application",
              "create_application",
              "update_application",
              "list_interviews",
              "create_interview",
              "get_interview",
              "calendar_events",
              "google_calendar_status",
              "google_calendar_sync",
              "google_calendar_list",
            ],
            version: "1.1.0",
          });
        }
        default:
          return err(`未知 action: ${body.action}`);
      }
    });
  } catch (e: unknown) {
    const msg = (e as Error).message;
    const code = msg.includes("API Key") ? 401 : 400;
    return err(msg, code);
  }
}

export async function GET(req: NextRequest) {
  try {
    assertMcpAuth(req);
    return ok({
      name: "recruit-copilot",
      version: "1.1.0",
      transport: "rest",
      docs: "/docs/mcp",
      endpoint: "POST /api/mcp with { action, payload }",
    });
  } catch (e: unknown) {
    return err((e as Error).message, 401);
  }
}
