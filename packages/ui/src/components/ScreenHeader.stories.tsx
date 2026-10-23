import type { Meta, StoryObj } from '@storybook/react-vite';
import { ScreenHeader } from './ScreenHeader';
import { Button } from './Button';

const meta: Meta<typeof ScreenHeader> = {
  title: 'Layout/ScreenHeader',
  component: ScreenHeader,
  args: { title: 'Users', subtitle: 'Manage access to your workspace.' },
};
export default meta;
type Story = StoryObj<typeof ScreenHeader>;
export const Default: Story = {};
export const WithActions: Story = { args: { actions: <Button>Create user</Button> } };
export const Dark: Story = { ...WithActions, globals: { theme: 'dark' } };
