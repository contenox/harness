import { useEffect, useRef } from 'react';
import { useProjectActions } from '../hooks/useProjectActions';

let launchFolderTaken = false;

/**
 * Opens folders handed to the desktop app: the one it was launched with and any requested
 * while it runs. Unknown folders become projects; either way a session is staged in them.
 */
export function LaunchFolderHandler() {
  const { openFolder } = useProjectActions();
  const openRef = useRef(openFolder);
  openRef.current = openFolder;

  useEffect(() => {
    const bridge = window.contenoxDesktop;
    if (!bridge) return;
    const handle = (folder: string) => {
      openRef.current(folder).catch(() => {
        // The folder was refused (e.g. too broad); the user can still add it from the sidebar.
      });
    };
    if (!launchFolderTaken) {
      launchFolderTaken = true;
      void bridge.takeLaunchFolder().then(folder => {
        if (folder) handle(folder);
      });
    }
    return bridge.onLaunchFolder(handle);
  }, []);

  return null;
}
