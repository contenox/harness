import { useState, type ReactNode } from 'react';
import { NavbarSlotSetterContext, NavbarSlotValueContext } from './navbarSlotState';

export function NavbarSlotProvider({ children }: { children: ReactNode }) {
  const [node, setNode] = useState<ReactNode>(null);
  return (
    <NavbarSlotSetterContext.Provider value={setNode}>
      <NavbarSlotValueContext.Provider value={node}>{children}</NavbarSlotValueContext.Provider>
    </NavbarSlotSetterContext.Provider>
  );
}
