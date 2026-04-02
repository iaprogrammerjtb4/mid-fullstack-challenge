"use client";

import { useRef } from "react";
import type { BoardDetail, Task, TaskPriority } from "@/lib/types";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { TaskTypeIcon } from "./TaskTypeIcon";

function priorityBadgeClasses(p: TaskPriority): string {
  switch (p) {
    case "high":
      return "border border-red-100 bg-red-50 text-red-700";
    case "medium":
      return "border border-blue-100 bg-blue-50 text-blue-700";
    case "low":
      return "border border-slate-200 bg-slate-100 text-slate-600";
    default:
      return "border border-slate-200 bg-slate-100 text-slate-600";
  }
}

type Props = {
  task: Task;
  board: BoardDetail;
  isDragging: boolean;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onMove: (columnId: number) => void;
  onDelete: () => void;
};

export function KanbanTaskCard({
  task,
  board,
  isDragging,
  onDragStart,
  onDragEnd,
  onMove,
  onDelete,
}: Props) {
  const cardRef = useRef<HTMLLIElement>(null);

  function handleDragStart(e: React.DragEvent) {
    if (cardRef.current) {
      e.dataTransfer.setDragImage(cardRef.current, 24, 24);
    }
    e.dataTransfer.effectAllowed = "move";
    onDragStart(e);
  }

  return (
    <li
      ref={cardRef}
      data-task-card
      className={`rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)] ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <div className="flex gap-2">
        <span
          draggable
          onDragStart={handleDragStart}
          onDragEnd={onDragEnd}
          className="mt-0.5 inline-flex shrink-0 cursor-grab touch-none text-slate-300 transition-colors duration-200 hover:text-slate-500 active:cursor-grabbing"
          aria-label="Drag to move task"
          title="Drag to move"
        >
          <svg viewBox="0 0 12 16" className="h-4 w-3" fill="currentColor" aria-hidden>
            <circle cx="3" cy="3" r="1.25" />
            <circle cx="9" cy="3" r="1.25" />
            <circle cx="3" cy="8" r="1.25" />
            <circle cx="9" cy="8" r="1.25" />
            <circle cx="3" cy="13" r="1.25" />
            <circle cx="9" cy="13" r="1.25" />
          </svg>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <TaskTypeIcon type={task.taskType} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <h4 className="text-sm font-semibold leading-snug text-slate-900">
                  {task.title}
                </h4>
                <span
                  className={`shrink-0 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${priorityBadgeClasses(task.priority)}`}
                >
                  {task.priority}
                </span>
              </div>
              {task.description ? (
                <p className="mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600">
                  {task.description}
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <label className="flex items-center gap-1 text-[11px] text-slate-500">
                <span className="sr-only">Move to column</span>
                <select
                  className="max-w-[7rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 transition-colors duration-200 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={task.columnId}
                  onChange={(e) => onMove(Number(e.target.value))}
                >
                  {board.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                onClick={onDelete}
                className="text-xs font-medium text-red-600 underline-offset-2 transition-colors duration-200 hover:text-red-700 hover:underline"
              >
                Delete
              </button>
            </div>
            <AssigneeAvatar name={task.assigneeName} />
          </div>
        </div>
      </div>
    </li>
  );
}
