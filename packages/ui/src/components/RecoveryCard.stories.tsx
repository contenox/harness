import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { RecoveryCard } from "./RecoveryCard";
import { Button } from "./Button";

const meta: Meta<typeof RecoveryCard> = {
  title: "Components/RecoveryCard",
  component: RecoveryCard,
  args: {
    title: "Ollama is not reachable",
    children: "Contenox could not connect to Ollama at http://localhost:11434. Make sure it is running.",
    actions: (
      <>
        <Button size="sm">Check again</Button>
        <Button size="sm" variant="outline">Configure</Button>
      </>
    ),
    details: "dial tcp 127.0.0.1:11434: connectex: No connection could be made because the target machine actively refused it.",
    detailsLabel: "Technical details",
  },
  decorators: [(Story) => <div className="max-w-lg"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof RecoveryCard>;

export const ErrorTone: Story = {
  play: async ({ canvasElement }) => {
    const c = within(canvasElement);
    await expect(c.getByRole("alert")).toBeVisible();
    await userEvent.click(c.getByRole("button", { name: "Technical details" }));
    await expect(c.getByText(/connectex/)).toBeVisible();
  },
};
export const Warning: Story = { args: { tone: "warning", title: "Key could not be verified", details: undefined } };
export const Info: Story = {
  args: { tone: "info", title: "Sign in required", children: "Sign in with ChatGPT to continue.", details: undefined },
};
export const TitleOnly: Story = { args: { children: undefined, actions: undefined, details: undefined } };
export const LongDetailsScroll: Story = { args: { details: "line of raw output\n".repeat(40) } };
export const NarrowWidth: Story = { decorators: [(Story) => <div className="w-72"><Story /></div>] };
