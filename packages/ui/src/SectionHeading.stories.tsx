import type { Meta, StoryObj } from "@storybook/react";
import { AdminBadge, SectionHeading } from "./index";

const meta = {
  title: "UI/SectionHeading",
  component: SectionHeading
} satisfies Meta<typeof SectionHeading>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    title: "연영회",
    subtitle: "연세대학교 중앙사진동아리"
  },
  render: (args) => (
    <div className="w-[420px] space-y-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] p-6">
      <SectionHeading {...args} />
      <AdminBadge>ADMIN</AdminBadge>
    </div>
  )
};
