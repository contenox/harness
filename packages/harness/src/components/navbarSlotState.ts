import {
  createContext,
  useContext,
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';

type SetNavbarSlotNode = Dispatch<SetStateAction<ReactNode>>;

export const NavbarSlotValueContext = createContext<ReactNode>(null);
export const NavbarSlotSetterContext = createContext<SetNavbarSlotNode>(() => {});

export function useNavbarSlotValue(): ReactNode {
  return useContext(NavbarSlotValueContext);
}

export function releaseNavbarSlot(current: ReactNode, claimed: ReactNode): ReactNode {
  return current === claimed ? null : current;
}

export function useNavbarSlot(node: ReactNode): void {
  const setNode = useContext(NavbarSlotSetterContext);
  const nodeRef = useRef(node);
  nodeRef.current = node;
  useEffect(() => {
    const claimed = nodeRef.current;
    setNode(claimed);
    return () => setNode(current => releaseNavbarSlot(current, claimed));
  }, [setNode]);
}
