import type { Meta, StoryObj } from "@storybook/react-vite";
import { FormField } from "./FormField";
import { Input } from "./Input";
import { Textarea } from "./TextArea";
import { Select } from "./Select";
import { expect, userEvent, within } from 'storybook/test';

const meta: Meta<typeof FormField> = {
  title: "Forms/FormField",
  component: FormField,
  argTypes: {
    required: { control: "boolean" },
  },
  args: {
    label: "Email address",
  },
  decorators: [
    (Story) => (
      <div style={{ width: "420px" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Default: Story = {
  args: {
    label: "Email address",
    children: <Input type="email" placeholder="you@example.com" />,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = canvas.getByRole('textbox', { name: 'Email address' });
    await userEvent.click(canvas.getByText('Email address'));
    await expect(input).toHaveFocus();
    await userEvent.type(input, 'operator@example.test');
    await expect(input).toHaveValue('operator@example.test');
  },
};

export const ExistingControlID: Story = {
  args: { label: 'Existing control', children: <Input id="existing-control" /> },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText('Existing control'));
    await expect(canvas.getByLabelText('Existing control')).toHaveFocus();
  },
};

export const Required: Story = {
  args: {
    label: "Full name",
    required: true,
    children: <Input placeholder="Jane Doe" />,
  },
};

export const WithDescription: Story = {
  args: {
    label: "Username",
    description: "3-20 characters",
    children: <Input placeholder="jdoe" />,
  },
};

export const WithTooltip: Story = {
  args: {
    label: "API key",
    tooltip: "Generate this from your account settings.",
    children: <Input placeholder="sk-..." />,
  },
};

export const WithError: Story = {
  args: {
    label: "Password",
    required: true,
    error: "Password must be at least 8 characters",
    children: <Input type="password" defaultValue="abc" error />,
  },
};

export const WithTextarea: Story = {
  args: {
    label: "Bio",
    description: "Optional",
    children: <Textarea rows={4} placeholder="Tell us about yourself..." />,
  },
};

export const WithSelect: Story = {
  args: {
    label: "Plan",
    required: true,
    children: (
      <Select
        placeholder="Choose a plan"
        options={[
          { value: "free", label: "Free" },
          { value: "pro", label: "Pro" },
          { value: "enterprise", label: "Enterprise" },
        ]}
      />
    ),
  },
};
