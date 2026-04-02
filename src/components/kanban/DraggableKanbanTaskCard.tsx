"use client";

import { useDraggable } from "@dnd-kit/core";
import type { BoardDetail, Task } from "@/lib/types";
import { KanbanTaskCard } from "./KanbanTaskCard";

type Props = {
  task: Task;
  board: BoardDetail;
  isPm: boolean;
  developerColumnSelectDisabled: boolean;
  onMove: (columnId: number) => void;
  onDelete: () => void;
  onAfterMutation: () => void | Promise<void>;
  /** First card on board (for product tour spotlight). */
  tourTaskCard?: boolean;
};

export function DraggableKanbanTaskCard({
  task,
  tourTaskCard,
  ...rest
}: Props) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { type: "task", task },
  });

  return (
    <div
      ref={setNodeRef}
      className={`relative ${isDragging ? "z-20" : "z-0"}`}
      style={isDragging ? { opacity: 0.45 } : undefined}
    >
      <KanbanTaskCard
        {...rest}
        task={task}
        dragHandleProps={{ ...listeners, ...attributes }}
        isDragging={isDragging}
        dataTourId={tourTaskCard ? "kanban-task-card" : undefined}
      />
    </div>
  );
}
