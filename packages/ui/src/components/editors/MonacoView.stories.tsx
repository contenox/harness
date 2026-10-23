import type { Meta, StoryObj } from '@storybook/react-vite';
import { useState } from 'react';
import { expect, userEvent, within } from 'storybook/test';
import MonacoView from './MonacoView';

const meta: Meta<typeof MonacoView> = {
  title: 'Editors/MonacoView',
  component: MonacoView,
  render: args => {
    const [value, setValue] = useState(args.value);
    return (
      <div>
        <div style={{ height: 360 }}>
          <MonacoView {...args} value={value} onChange={setValue} />
        </div>
        <output aria-label="Draft">{value}</output>
      </div>
    );
  },
  args: {
    path: 'welcome.md',
    value: '# Welcome',
    options: { ariaLabel: 'Editor', editContext: false },
  },
};
export default meta;
type Story = StoryObj<typeof MonacoView>;
export const Editable: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const input = await canvas.findByRole(
      'textbox',
      { name: 'Editor', exact: true },
      { timeout: 20000 },
    );
    await userEvent.click(input);
    await userEvent.keyboard('{Control>}a{/Control}');
    await userEvent.keyboard('# Changed');
    await expect(canvas.getByLabelText('Draft')).toHaveTextContent('# Changed');
  },
};
export const ReadOnly: Story = { args: { readOnly: true } };
export const Dark: Story = { args: { path: 'dark.md' }, globals: { theme: 'dark' } };
