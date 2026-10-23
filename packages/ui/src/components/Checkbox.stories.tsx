import type { Meta, StoryObj } from "@storybook/react-vite";
import { Checkbox } from "./Checkbox";
import { expect, userEvent, within } from 'storybook/test';

const meta: Meta<typeof Checkbox> = {
  title: "Forms/Checkbox",
  component: Checkbox,
  argTypes: {
    disabled: { control: "boolean" },
    indeterminate: { control: "boolean" },
    checked: { control: "boolean" },
  },
  args: {
    label: "Accept terms",
  },
};

export default meta;
type Story = StoryObj<typeof Checkbox>;

export const Default: Story = {
  play: async ({ canvasElement }) => {
    const checkbox = within(canvasElement).getByRole('checkbox', { name: 'Accept terms' });
    await expect(checkbox).not.toBeChecked();
    await userEvent.click(checkbox);
    await expect(checkbox).toBeChecked();
  },
};

export const Empty: Story = {
  args: { label: "Subscribe to newsletter", defaultChecked: false },
};

export const Filled: Story = {
  args: { label: "Subscribed", defaultChecked: true },
};

export const Indeterminate: Story = {
  args: { label: "Select all", indeterminate: true },
};

export const Disabled: Story = {
  args: { label: "Cannot toggle", disabled: true, defaultChecked: true },
};

export const Group: Story = {
  render: () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <Checkbox label="Option A" defaultChecked />
      <Checkbox label="Option B" />
      <Checkbox label="Option C" />
      <Checkbox label="Disabled option" disabled />
    </div>
  ),
};
