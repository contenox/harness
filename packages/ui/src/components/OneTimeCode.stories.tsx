import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { COPIED_RESET_MS, OneTimeCode } from "./OneTimeCode";

const meta: Meta<typeof OneTimeCode> = {
  title: "Components/OneTimeCode",
  component: OneTimeCode,
  args: { value: "PLGQ-T2YJJ", copyLabel: "Copy", copiedLabel: "Copied" },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof OneTimeCode>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: async () => {} },
      configurable: true,
    });
    const c = within(canvasElement);
    await userEvent.click(c.getByRole("button", { name: "Copy" }));
    await expect(await c.findByRole("button", { name: "Copied" })).toBeVisible();
    // The confirmation reverts, and the button copies again on every click.
    await expect(await c.findByRole("button", { name: "Copy" }, { timeout: COPIED_RESET_MS + 1500 })).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "Copy" }));
    await expect(await c.findByRole("button", { name: "Copied" })).toBeVisible();
  },
};
export const AlreadyCopied: Story = {
  args: { copied: true },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("button", { name: "Copied" })).toBeVisible();
    // An automatic copy also only confirms briefly.
    await expect(await c.findByRole("button", { name: "Copy" }, { timeout: COPIED_RESET_MS + 1500 })).toBeVisible();
  },
};
export const LongCode: Story = {
  args: { value: "ABCD-EFGH-IJKL-MNOP" },
  decorators: [(Story) => <div className="w-64"><Story /></div>],
};
