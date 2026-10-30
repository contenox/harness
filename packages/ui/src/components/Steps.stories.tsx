import type { Meta, StoryObj } from "@storybook/react-vite";
import { Step, Steps } from "./Steps";

const meta: Meta<typeof Steps> = {
  title: "Components/Steps",
  component: Steps,
  decorators: [(Story) => <div className="max-w-sm"><Story /></div>],
};
export default meta;
type Story = StoryObj<typeof Steps>;

export const Default: Story = {
  render: () => (
    <Steps>
      <Step number={1} title="Open the page">Use the link in your browser.</Step>
      <Step number={2} title="Enter the code">It expires in ten minutes.</Step>
      <Step number={3} title="Confirm" />
    </Steps>
  ),
};

export const WithDoneSteps: Story = {
  render: () => (
    <Steps>
      <Step number={1} title="Signed in" done />
      <Step number={2} title="Code entered" done />
      <Step number={3} title="Waiting for confirmation">This window continues automatically.</Step>
    </Steps>
  ),
};

export const LongTitles: Story = {
  render: () => (
    <Steps>
      <Step number={1} title="A very long instruction title that has to wrap onto a second line in narrow layouts">
        And an equally long explanatory paragraph that wraps as well, to check alignment with the number badge.
      </Step>
    </Steps>
  ),
};
