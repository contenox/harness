import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from 'react';


type SetNavbarSlotNode = Dispatch<SetStateAction<ReactNode>>;

const NavbarSlotValueContext = createContext<ReactNode>(null);
const NavbarSlotSetterContext = createContext<SetNavbarSlotNode>(() => {});

export function NavbarSlotProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  return (
    <NavbarSlotSetterContext.Provider value={setNode}>
      <NavbarSlotValueContext.Provider value={node}>{children}</NavbarSlotValueContext.Provider>
    </NavbarSlotSetterContext.Provider>
  );
}

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
