import type { Meta, StoryObj } from "@storybook/react-vite";
import { StatusDot } from "./StatusDot";

const meta: Meta<typeof StatusDot> = {
  title: "Components/StatusDot",
  component: StatusDot,
  args: { status: "available", label: "Available" },
  argTypes: {
    status: { control: "select", options: ["available", "checking", "attention", "unavailable", "unknown"] },
  },
};
export default meta;
type Story = StoryObj<typeof StatusDot>;

export const Default: Story = {};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-col gap-2">
      <StatusDot status="available" label="Available" />
      <StatusDot status="checking" label="Checking" />
      <StatusDot status="attention" label="Needs attention" />
      <StatusDot status="unavailable" label="Unavailable" />
      <StatusDot status="unknown" label="Unknown" />
    </div>
  ),
};

export const DotOnly: Story = {
  args: { label: undefined, "aria-label": "Available" },
};
