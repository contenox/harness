import React from "react";
import { cn } from "../utils";
import { useDragDropContext } from "./DragDropContext";

interface DraggableProps {
  draggableId: string;
  children: React.ReactNode;
  className?: string;
  isDragDisabled?: boolean;
  index?: number;
}

export function Draggable({
  draggableId,
  children,
  className,
  isDragDisabled = false,
  index,
}: DraggableProps) {
  const { startDrag, endDrag, isDragging } = useDragDropContext();

  const handleDragStart = (e: React.DragEvent) => {
    if (isDragDisabled) return;

    e.dataTransfer.setData("text/plain", draggableId);
    e.dataTransfer.effectAllowed = "move";

    startDrag(draggableId, "default");

    if (e.dataTransfer && e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.preventDefault();
    endDrag();
  };

  const dragging = isDragging(draggableId);

  return (
    <div
      draggable={!isDragDisabled}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      className={cn(
        "cursor-grab active:cursor-grabbing",
        dragging && "opacity-50",
        !isDragDisabled &&
          "hover:bg-hover",
        className,
      )}
      data-draggable-id={draggableId}
      data-index={index}
    >
      {children}
    </div>
  );
}
