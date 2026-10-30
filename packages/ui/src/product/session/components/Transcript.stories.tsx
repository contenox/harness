import type { Meta, StoryObj } from '@storybook/react-vite';
import { expect, userEvent, within } from 'storybook/test';
import { initialAcpSessionState, type AcpSessionState, type AcpToolCallState } from '../state/acpSessionState';
import { Transcript } from './Transcript';

/**
 * Tool call cards in the transcript. The widths come from the three Storybook
 * test viewports (412 / 820 / 1280); the theme toolbar switches light and dark.
 */
const meta: Meta<typeof Transcript> = { title: 'Session/Transcript/Tool calls', component: Transcript };
export default meta;
type Story = StoryObj<typeof Transcript>;

function sessionWith(call: AcpToolCallState): AcpSessionState {
  return {
    ...initialAcpSessionState,
    items: [{ kind: 'tool_call', id: call.toolCallId }],
    toolCalls: { [call.toolCallId]: call },
  };
}

const textBlock = (text: string): NonNullable<AcpToolCallState['content']> => [
  { type: 'content', content: { type: 'text', text } },
];

function render(call: AcpToolCallState) {
  return () => (
    <div style={{ maxWidth: 720 }}>
      <Transcript session={sessionWith(call)} />
    </div>
  );
}

async function openDetail(canvasElement: HTMLElement) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole('button', { name: 'Toggle detail' }));
  return canvas;
}

const FAILED = { toolCallId: 'c1', title: 'Run build', kind: 'execute', status: 'failed' } as const;

export const FailedErrorOnly: Story = {
  render: render({ ...FAILED, content: textBlock('policy denied this call') }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Error')).toBeVisible();
    const alert = (await openDetail(canvasElement)).getByRole('alert');
    await expect(alert).toHaveTextContent('policy denied this call');
  },
};

export const FailedErrorOnlyDark: Story = { ...FailedErrorOnly, globals: { theme: 'dark' } };
export const FailedErrorOnlyLight: Story = { ...FailedErrorOnly, globals: { theme: 'light' } };

export const FailedErrorWithInput: Story = {
  render: render({
    ...FAILED,
    meta: { error: 'the arguments never reached the runtime' },
    rawInput: { command: 'npm run build' },
  }),
  play: async ({ canvasElement }) => {
    const alert = (await openDetail(canvasElement)).getByRole('alert');
    await expect(alert).toHaveTextContent('the arguments never reached the runtime');
  },
};

export const FailedErrorWithRawOutput: Story = {
  render: render({ ...FAILED, rawInput: { command: 'npm run build' }, rawOutput: 'npm ERR! exit status 1' }),
  play: async ({ canvasElement }) => {
    const canvas = await openDetail(canvasElement);
    await expect(canvas.getByRole('alert')).toHaveTextContent('npm ERR! exit status 1');
    // The raw output is also listed in its own block below the notice.
    await expect(canvas.getAllByText('npm ERR! exit status 1')).toHaveLength(2);
  },
};

export const CompletedTextOutputIsNotAnError: Story = {
  render: render({
    toolCallId: 'c2',
    title: 'Run build',
    kind: 'execute',
    status: 'completed',
    content: textBlock('build finished in 4s'),
    rawOutput: 'build finished in 4s',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText('Done')).toBeVisible();
    await expect(canvas.queryByText('Error')).toBeNull();
    const detail = await openDetail(canvasElement);
    await expect(detail.queryByRole('alert')).toBeNull();
    await expect(detail.getByText('build finished in 4s')).toBeVisible();
  },
};

export const RunningTextOutputIsNotAnError: Story = {
  render: render({
    toolCallId: 'c3',
    title: 'Run build',
    kind: 'execute',
    status: 'in_progress',
    content: textBlock('compiling...'),
    rawOutput: 'compiling...',
  }),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.queryByText('Error')).toBeNull();
    await expect((await openDetail(canvasElement)).queryByRole('alert')).toBeNull();
  },
};
