import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, within } from 'storybook/test';
import { Files } from 'lucide-react';
import { WorkspaceShell, PageContent } from './WorkspaceShell';
import { NavItem } from './NavItem';
import { TitleBar } from './TitleBar';

const meta: Meta<typeof WorkspaceShell> = {
  title: 'Layout/WorkspaceShell',
  component: WorkspaceShell,
  args: {
    header: 'Contenox CRM',
    navigation: <nav aria-label="Primary"><NavItem href="#files" icon={<Files />} label="Files" isActive>Files</NavItem></nav>,
    children: <PageContent>Workspace content</PageContent>,
  },
};
export default meta;
type Story = StoryObj<typeof WorkspaceShell>;

export const Responsive: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const navigation = canvas.getByRole('navigation', { name: 'Primary', hidden: true });
    const item = within(navigation).getByText('Files');
    if (window.innerWidth < 640) await expect(navigation).not.toBeVisible();
    else {
      await expect(navigation).toBeVisible();
      await expect(canvas.getByRole('link', { name: 'Files' })).toHaveAttribute('aria-current', 'page');
      await expect(item).toBeVisible();
    }
  },
};
export const Dark: Story = { ...Responsive, globals: { theme: 'dark' } };

export const Collapsible: Story = {
  args: {
    header: undefined,
    navigation: undefined,
    titleBar: <TitleBar start={<span>Toggle</span>}>Title</TitleBar>,
    sidebar: <nav aria-label="Sidebar" className="p-2">Sidebar</nav>,
    sidebarOpen: true,
    rightPane: <div className="w-64 p-3">Right pane</div>,
    scroll: false,
  },
};
