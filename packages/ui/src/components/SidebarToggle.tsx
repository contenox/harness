import { PanelLeft } from "lucide-react";
import { IconButton } from "./IconButton";

type SidebarToggleProps = {
  isOpen: boolean;
  onToggle: () => void;
};

export function SidebarToggle({ isOpen, onToggle }: SidebarToggleProps) {
  return (
    <IconButton
      label="Toggle sidebar"
      onClick={onToggle}
      aria-expanded={isOpen}
      noTooltip
    >
      <PanelLeft className="size-4" />
    </IconButton>
  );
}
