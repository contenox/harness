import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { MarkdownPreview } from './MarkdownPreview';

const meta: Meta<typeof MarkdownPreview> = {
  title: 'Editors/MarkdownPreview',
  component: MarkdownPreview,
  args: {
    label: 'Preview',
    value:
      '# Welcome\n\nContent stored in the **VFS**.\n\n- [x] Draft\n- [ ] Publish\n\n| Page | State |\n| --- | --- |\n| Home | Draft |',
  },
};
export default meta;
type Story = StoryObj<typeof MarkdownPreview>;
export const Document: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole('heading', { name: 'Welcome' })).toBeVisible();
    await expect(canvas.getByRole('table')).toBeVisible();
  },
};
export const Dark: Story = { ...Document, globals: { theme: 'dark' } };
export const EscapedHTML: Story = {
  args: { value: '<img src="invalid" onerror="alert(1)">\n\n[Unsafe](javascript:alert(1))' },
  play: async ({ canvasElement }) => {
    await expect(canvasElement.querySelector('img')).toBeNull();
    await expect(canvasElement.querySelector('a')?.getAttribute('href')).not.toContain(
      'javascript:',
    );
  },
};
