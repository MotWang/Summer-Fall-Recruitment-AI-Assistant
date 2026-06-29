import { listApplications, listSharedExperiences } from "@/lib/repo";
import { SectionTitle } from "@/components/ui";
import { ExperienceBoard } from "./board";

export const dynamic = "force-dynamic";

export default function ExperiencesPage({ searchParams }: { searchParams: { company?: string } }) {
  const list = listSharedExperiences({ company: searchParams.company });
  const apps = listApplications();
  return (
    <div>
      <SectionTitle
        eyebrow="04 · EXPERIENCES"
        title="面经库"
        subtitle="自动按公司聚合。新建时会尝试关联到同公司投递；在投递详情页内也能直接管理。"
      />
      <ExperienceBoard list={list} apps={apps} initialFilter={searchParams.company ?? ""} />
    </div>
  );
}
