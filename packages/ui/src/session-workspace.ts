/**
 * The session workbench: file tree, open files, preview, activity and the
 * layout that puts them beside a conversation.
 *
 * This entry carries Monaco (the file preview), so consumers import it only in
 * the workbench route — not from the chat surface's main chunk.
 */
export * from './product/session/workspace/SessionWorkspaceLayout';
export * from './product/session/workspace/useSessionWorkspace';
export * from './product/session/workspace/FileCanvas';
export * from './product/session/workspace/fileCanvasState';
export * from './product/session/workspace/previewRegistry';
export * from './product/session/workspace/AssetActionToolbar';
