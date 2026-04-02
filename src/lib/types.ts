import type { z } from "zod";
import type { prioritySchema } from "./schemas";

export type TaskPriority = z.infer<typeof prioritySchema>;

export type BoardSummary = {
  id: number;
  name: string;
  createdAt: string;
};

export type Task = {
  id: number;
  columnId: number;
  title: string;
  description: string;
  priority: TaskPriority;
  createdAt: string;
};

export type ColumnWithTasks = {
  id: number;
  boardId: number;
  name: string;
  displayOrder: number;
  tasks: Task[];
};

export type BoardDetail = BoardSummary & {
  columns: ColumnWithTasks[];
};
