import { SectionTitle } from "@/components/ui";
import { ExperienceBoard } from "./board";

export const dynamic = "force-dynamic";

export default function ExperiencesPage() {
  return (
    <div>
      <SectionTitle
        eyebrow="面经"
        title="面经库"
        subtitle="按公司自动聚合。新建会尝试关联到同公司投递；在投递详情页也能管理。"
      />
      <ExperienceBoard />
    </div>
  );
}
