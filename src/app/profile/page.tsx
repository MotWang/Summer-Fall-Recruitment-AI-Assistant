import { listProfileEntries } from "@/lib/repo";
import { SectionTitle } from "@/components/ui";
import { ProfileTimeline } from "./timeline";

export const dynamic = "force-dynamic";

export default function ProfilePage() {
  const entries = listProfileEntries();
  return (
    <div>
      <SectionTitle
        eyebrow="03 · PROFILE"
        title="你的经历时间轴"
        subtitle="实习 / 项目 / 校内 / 获奖 / 技能 / 感悟 — 按时间排列，颜色区分类别。上传 PDF / Word 简历，AI 自动拆分到对应模块；冲突的内容由你来决定保留、合并还是丢弃。"
      />
      <ProfileTimeline entries={entries} />
    </div>
  );
}
