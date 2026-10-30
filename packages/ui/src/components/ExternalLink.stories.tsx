import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { ExternalLink } from "./ExternalLink";

const meta: Meta<typeof ExternalLink> = {
  title: "Components/ExternalLink",
  component: ExternalLink,
  args: { href: "https://console.anthropic.com/settings/keys", children: "Create a key" },
};
export default meta;
type Story = StoryObj<typeof ExternalLink>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const link = within(canvasElement).getByRole("link", { name: "Create a key" });
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  },
};

export const InsideText: Story = {
  render: () => (
    <p className="max-w-sm text-sm text-text-muted">
      Need a key? <ExternalLink href="https://example.com">Create one in the console</ExternalLink> and paste it here.
    </p>
  ),
};

export const LongLabelWraps: Story = {
  render: () => (
    <div className="w-48">
      <ExternalLink href="https://example.com">A considerably longer link label that wraps</ExternalLink>
    </div>
  ),
};
