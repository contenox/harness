import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { useState } from "react";
import { Cloud, Cpu, KeyRound, Server } from "lucide-react";
import { SettingsGroup, SettingsRow } from "./SettingsGroup";
import { StatusDot } from "./StatusDot";
import { Input } from "./Input";
import { Button } from "./Button";

const meta: Meta<typeof SettingsGroup> = {
  title: "Components/SettingsGroup",
  component: SettingsGroup,
  decorators: [(Story) => <div className="max-w-xl"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof SettingsGroup>;

const Body = () => (
  <div className="flex flex-col gap-3">
    <Input aria-label="Key" placeholder="Value" />
    <div className="flex justify-end"><Button size="sm">Save</Button></div>
  </div>
);

export const Collapsed: Story = {
  args: { title: "Recommended" },
  render: (args) => (
    <SettingsGroup {...args}>
      <SettingsRow icon={<Cloud />} title="Anthropic" description="Claude models via API key"><Body /></SettingsRow>
      <SettingsRow icon={<KeyRound />} title="OpenAI" description="GPT models via API key"><Body /></SettingsRow>
      <SettingsRow icon={<Cpu />} title="Gemini" description="Google models via API key"><Body /></SettingsRow>
    </SettingsGroup>
  ),
};

export const WithoutTitle: Story = {
  render: () => (
    <SettingsGroup>
      <SettingsRow title="Only row" description="No group caption"><Body /></SettingsRow>
    </SettingsGroup>
  ),
};

export const NonExpandableAndDisabled: Story = {
  render: () => (
    <SettingsGroup title="Local">
      <SettingsRow icon={<Server />} title="Ollama" description="Connected" trailing={<StatusDot status="available" label="Ready" />} />
      <SettingsRow icon={<Cpu />} title="vLLM" description="Not available on this device" disabled><Body /></SettingsRow>
      <SettingsRow
        icon={<Cloud />}
        title="Very long provider name that has to be truncated in a narrow container"
        description="A very long one line description that must be truncated rather than wrapping onto a second line"
        trailing={<StatusDot status="attention" label="Check" />}
      >
        <Body />
      </SettingsRow>
    </SettingsGroup>
  ),
};

export const OneOpenAtATime: Story = {
  render: function Render() {
    const [open, setOpen] = useState<string | null>("a");
    const row = (id: string, title: string) => (
      <SettingsRow key={id} title={title} description="Controlled by the parent" expanded={open === id} onExpandedChange={(e) => setOpen(e ? id : null)}>
        <Body />
      </SettingsRow>
    );
    return <SettingsGroup title="Accordion behaviour">{row("a", "First")}{row("b", "Second")}{row("c", "Third")}</SettingsGroup>;
  },
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const first = c.getByRole("button", { name: /First/ });
    const second = c.getByRole("button", { name: /Second/ });
    await expect(first).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(second);
    await expect(second).toHaveAttribute("aria-expanded", "true");
    await expect(first).toHaveAttribute("aria-expanded", "false");
  },
};

export const KeyboardNavigation: Story = {
  args: { title: "Keyboard" },
  render: (args) => (
    <SettingsGroup {...args}>
      <SettingsRow title="One" description="a"><Body /></SettingsRow>
      <SettingsRow title="Two" description="b" disabled><Body /></SettingsRow>
      <SettingsRow title="Three" description="c"><Body /></SettingsRow>
      <SettingsRow title="Four" description="d"><Body /></SettingsRow>
    </SettingsGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const one = c.getByRole("button", { name: /One/ });
    const three = c.getByRole("button", { name: /Three/ });
    const four = c.getByRole("button", { name: /Four/ });
    one.focus();
    await userEvent.keyboard("{ArrowDown}");
    await expect(three).toHaveFocus(); // disabled row is skipped
    await userEvent.keyboard("{End}");
    await expect(four).toHaveFocus();
    await userEvent.keyboard("{Home}");
    await expect(one).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}");
    await expect(four).toHaveFocus(); // wraps
    await userEvent.keyboard("{Enter}");
    await expect(four).toHaveAttribute("aria-expanded", "true");
    await userEvent.keyboard(" ");
    await expect(four).toHaveAttribute("aria-expanded", "false");
  },
};

export const UncontrolledWithCallback: Story = {
  args: { title: "Callback" },
  render: () => (
    <SettingsGroup title="Callback">
      <SettingsRow title="Row" onExpandedChange={fn()}><Body /></SettingsRow>
    </SettingsGroup>
  ),
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    const btn = c.getByRole("button", { name: /Row/ });
    await userEvent.click(btn);
    await expect(btn).toHaveAttribute("aria-expanded", "true");
    await expect(c.getByRole("region", { name: /Row/ })).toBeVisible();
  },
};
