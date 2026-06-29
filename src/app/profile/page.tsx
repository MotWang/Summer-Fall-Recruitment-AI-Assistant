import { listProfileEntries } from "@/lib/repo";
import { SectionTitle } from "@/components/ui";
import { ProfileTimeline } from "./timeline";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const entries = listProfileEntries();
  return (
    <div>
      <SectionTitle
        eyebrow="个人资料"
        title="个人资料"
        subtitle="像 LinkedIn 一样按章节组织：基本信息 → 技能 → 教育 → 实习 → 项目 → 校园 → 获奖 → 其他。上传 PDF / Word 简历自动拆分到对应模块；冲突由你决定保留、合并还是丢弃。"
      />
      <ProfileTimeline entries={entries} />
    </div>
  );
}
