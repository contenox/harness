export function resolveWorkspaceRoot(args: {
  onEmptyChat: boolean;
  stagedRoot: string | undefined;
  defaultRoot: string | undefined;
  activeSessionCwd: string | null;
}): string | null {
  const { onEmptyChat, stagedRoot, defaultRoot, activeSessionCwd } = args;
  if (!onEmptyChat) return activeSessionCwd;
  if (stagedRoot) return stagedRoot;
  return defaultRoot ?? null;
}
