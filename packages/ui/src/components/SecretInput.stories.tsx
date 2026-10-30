import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import { SecretInput, type SecretInputProps } from "./SecretInput";

const meta: Meta<typeof SecretInput> = {
  title: "Components/SecretInput",
  component: SecretInput,
  args: {
    showLabel: "Show key",
    hideLabel: "Hide key",
    storedLabel: "API key saved",
    replaceLabel: "Replace",
    placeholder: "sk-...",
    "aria-label": "API key",
  },
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof SecretInput>;

function Controlled(args: SecretInputProps) {
  const [value, setValue] = useState("");
  return <SecretInput {...args} value={value} onChange={(e) => setValue(e.target.value)} />;
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const input = c.getByLabelText("API key");
    await expect(input).toHaveAttribute("type", "password");
    await expect(input).toHaveAttribute("autocomplete", "off");
    await expect(input).toHaveAttribute("spellcheck", "false");
    await userEvent.type(input, "secret");
    await userEvent.click(c.getByRole("button", { name: "Show key" }));
    await expect(input).toHaveAttribute("type", "text");
    await expect(c.getByRole("button", { name: "Hide key" })).toBeVisible();
  },
};

export const WithError: Story = { args: { error: true, defaultValue: "bad" } };
export const Disabled: Story = { args: { disabled: true } };

export const StoredSecret: Story = {
  args: { stored: true, onReplace: fn() },
  render: (args) => <Controlled {...args} />,
  play: async ({ canvasElement, args }) => {
    const c = within(canvasElement);
    await expect(c.queryByLabelText("API key")).toBeNull();
    await userEvent.click(c.getByRole("button", { name: "Replace" }));
    await expect(args.onReplace).toHaveBeenCalledTimes(1);
    await expect(c.getByLabelText("API key")).toHaveFocus();
    await expect(c.getByLabelText("API key")).toHaveValue("");
  },
};
