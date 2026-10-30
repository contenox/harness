import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { Disclosure } from "./Disclosure";
import { Input } from "./Input";

const meta: Meta<typeof Disclosure> = {
  title: "Components/Disclosure",
  component: Disclosure,
  args: { label: "Advanced", children: <Input aria-label="Base URL" placeholder="https://" /> },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Disclosure>;

export const Closed: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const toggle = c.getByRole("button", { name: "Advanced" });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(c.getByLabelText("Base URL")).toBeVisible();
    await userEvent.keyboard("{Enter}");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
  },
};

export const OpenByDefault: Story = { args: { defaultOpen: true } };

export const Controlled: Story = { args: { open: true, onOpenChange: () => {} } };

export const LongContent: Story = {
  args: {
    label: "Technical details",
    children: (
      <p className="text-xs text-text-muted">
        {"A long body that wraps across several lines to show spacing below the toggle. ".repeat(4)}
      </p>
    ),
  },
};
