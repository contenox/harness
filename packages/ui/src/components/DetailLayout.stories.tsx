import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { useState } from 'react';
import { DetailLayout } from './DetailLayout';
import { Button } from './Button';
import { FormField } from './FormField';
import { Input } from './Input';

const meta: Meta<typeof DetailLayout> = { title: 'Layout/DetailLayout', component: DetailLayout };
export default meta;
type Story = StoryObj<typeof DetailLayout>;

function Example() {
  const [open, setOpen] = useState(false);
  return (
    <DetailLayout
      open={open}
      onClose={() => setOpen(false)}
      backLabel="Back to list"
      detail={
        <FormField label="Draft">
          <Input />
        </FormField>
      }>
      <Button onClick={() => setOpen(true)}>Open detail</Button>
    </DetailLayout>
  );
}

export const PreservesDraft: Story = {
  render: () => <Example />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const opener = canvas.getByRole('button', { name: 'Open detail' });
    await userEvent.click(opener);
    const draft = canvas.getByRole('textbox', { name: 'Draft' });
    await userEvent.type(draft, 'Keep this draft');
    if (window.innerWidth < 1024) await expect(opener).not.toBeVisible();
    else await expect(opener).toBeVisible();
    await userEvent.click(canvas.getByRole('button', { name: 'Back to list' }));
    await expect(opener).toBeVisible();
    await userEvent.click(opener);
    await expect(draft).toHaveValue('Keep this draft');
  },
};
