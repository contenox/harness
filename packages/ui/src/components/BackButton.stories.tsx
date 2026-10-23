import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, fn, userEvent, within } from 'storybook/test';
import { BackButton } from './BackButton';

const meta: Meta<typeof BackButton> = {
  title: 'Navigation/BackButton',
  component: BackButton,
  args: { label: 'Back to files', onClick: fn() },
};
export default meta;
type Story = StoryObj<typeof BackButton>;
export const Default: Story = {
  play: async ({ canvasElement, args }) => {
    await userEvent.click(within(canvasElement).getByRole('button', { name: 'Back to files' }));
    await expect(args.onClick).toHaveBeenCalled();
  },
};
