import type { Meta, StoryObj } from "@storybook/react-vite";
import { CopyRow, CopyValueButton } from "./CopyValue";

const meta: Meta<typeof CopyValueButton> = {
  title: "Components/CopyValueButton",
  component: CopyValueButton,
  args: { value: "contenox serve --port 8080", label: "Copy" },
};
export default meta;
type Story = StoryObj<typeof CopyValueButton>;

export const Default: Story = {};
export const CustomCopiedLabel: Story = { args: { label: "Kopieren", copiedLabel: "Kopiert" } };
export const Row: Story = {
  render: () => (
    <div className="max-w-sm">
      <CopyRow label="Command" copyLabel="Kopieren" copiedLabel="Kopiert" value="contenox serve --port 8080" />
    </div>
  ),
};
