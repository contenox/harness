import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../lib/fetch';
import { createHostTerminalSession } from './useHostTerminalSession';

vi.mock('../lib/projectRuntime', () => ({
  cwdApiFetch: vi.fn(),
}));

const { cwdApiFetch } = await import('../lib/projectRuntime');
const fetchMock = vi.mocked(cwdApiFetch);

function sentBody(call = 0): unknown {
  const init = fetchMock.mock.calls[call][2] as { body: string };
  return JSON.parse(init.body);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('createHostTerminalSession', () => {
  it('returns the opened session on success and omits a blank cwd from the wire', async () => {
    fetchMock.mockResolvedValueOnce({
      id: 'sess-1',
      wsPath: '/api/terminal/sessions/sess-1/ws',
    });
    await expect(createHostTerminalSession('', 80, 24)).resolves.toEqual({
      id: 'sess-1',
      wsPath: '/api/terminal/sessions/sess-1/ws',
    });
    expect(fetchMock.mock.calls[0][0]).toBe('');
    expect(fetchMock.mock.calls[0][1]).toBe('/api/terminal/sessions');
    expect(sentBody()).toEqual({ cols: 80, rows: 24 });
  });

  it('includes a non-blank cwd', async () => {
    fetchMock.mockResolvedValueOnce({ id: 'x', wsPath: '/ws' });
    await createHostTerminalSession('/home/user/project', 120, 40);
    expect(fetchMock.mock.calls[0][0]).toBe('/home/user/project');
    expect(sentBody()).toEqual({ cwd: '/home/user/project', cols: 120, rows: 40 });
  });

  it('folds a 404 into the absent sentinel (null)', async () => {
    fetchMock.mockRejectedValueOnce(new ApiError('not found', 404));
    await expect(createHostTerminalSession('', 80, 24)).resolves.toBeNull();
  });

  it('propagates a 422 refusal (too many sessions / bad cwd) as a real error', async () => {
    fetchMock.mockRejectedValueOnce(
      new ApiError('too many terminal sessions', 422),
    );
    await expect(createHostTerminalSession('', 80, 24)).rejects.toMatchObject({ status: 422 });
  });
});
