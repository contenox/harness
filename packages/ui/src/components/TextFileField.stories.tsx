import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { useState } from "react";
import { TextFileField, type TextFileFieldProps } from "./TextFileField";

const labels = {
  choose: "Choose file",
  textLabel: "Credentials JSON",
  placeholder: "Or paste the contents here",
  tooLarge: "The file is too large.",
  invalidJson: "This is not valid JSON.",
  readFailed: "The file could not be read.",
};

const meta: Meta<typeof TextFileField> = {
  title: "Components/TextFileField",
  component: TextFileField,
  args: { labels },
  decorators: [(Story) => <div className="max-w-md"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof TextFileField>;

function Controlled(props: Omit<TextFileFieldProps, "value" | "onChange"> & { initial?: string }) {
  const { initial, ...rest } = props;
  const [value, setValue] = useState(initial ?? "");
  return <TextFileField {...rest} value={value} onChange={setValue} />;
}

export const Empty: Story = {
  render: (args) => <Controlled {...args} />,
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await userEvent.click(c.getByLabelText("Credentials JSON"));
    await userEvent.paste("not json");
    await expect(c.getByRole("alert")).toHaveTextContent("This is not valid JSON.");
  },
};

export const ValidJson: Story = {
  render: (args) => <Controlled {...args} initial={`{"type":"service_account"}`} />,
};
export const InvalidJson: Story = { render: (args) => <Controlled {...args} initial="{oops" /> };
export const TooLarge: Story = {
  args: { maxBytes: 10 },
  render: (args) => <Controlled {...args} initial={`{"a":"0123456789"}`} />,
};
export const ExternalError: Story = {
  args: { error: "The server rejected these credentials." },
  render: (args) => <Controlled {...args} initial="{}" />,
};
export const CustomValidator: Story = {
  args: { validate: (t: string) => (t.includes("client_email") ? null : "Missing client_email.") },
  render: (args) => <Controlled {...args} initial="{}" />,
};
export const PlainText: Story = {
  args: { accept: ".txt,text/plain" },
  render: (args) => <Controlled {...args} initial="any text is fine" />,
};
export const Disabled: Story = { args: { disabled: true }, render: (args) => <Controlled {...args} /> };
