import { notFound } from "next/navigation";
import {
  getApplication,
  listAiArtifacts,
  listInterviews,
  listSharedExperiences,
} from "@/lib/repo";
import { ApplicationDetail } from "./view";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { id: string } }) {
  const app = getApplication(params.id);
  if (!app) return notFound();
  const interviews = listInterviews(app.id);
  const artifacts = listAiArtifacts(app.id);
  // 面经：按公司模糊匹配 + 明确绑定到该 app 的，合并去重
  const expByCompany = listSharedExperiences({ company: app.company });
  const expByApp = listSharedExperiences({ applicationId: app.id });
  const seen = new Set<string>();
  const experiences = [...expByApp, ...expByCompany].filter((e) => {
    if (seen.has(e.id)) return false;
    seen.add(e.id);
    return true;
  });
  return (
    <ApplicationDetail
      app={app}
      interviews={interviews}
      artifacts={artifacts}
      experiences={experiences}
    />
  );
}
