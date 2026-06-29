import { listApplications } from "@/lib/repo";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/types";
import { SectionTitle } from "@/components/ui";
import { ApplicationsView } from "./applications-view";

export const dynamic = "force-dynamic";

export default function ApplicationsPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string };
}) {
  const filterStatus = APPLICATION_STATUSES.includes(searchParams.status as ApplicationStatus)
    ? (searchParams.status as ApplicationStatus)
    : undefined;
  const apps = listApplications({ status: filterStatus, search: searchParams.q });

  return (
    <div>
      <SectionTitle
        eyebrow="投递"
        title="投递看板"
        subtitle="一张表格，所有岗位一目了然。点击状态 pill 即时切换；顶部解析栏把 JD → 入库压缩为一步。"
      />
      <ApplicationsView
        initialApps={apps}
        initialStatus={filterStatus ?? null}
        initialSearch={searchParams.q ?? ""}
      />
    </div>
  );
}
