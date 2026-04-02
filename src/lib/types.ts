import type { z } from "zod";
import type { prioritySchema, taskTypeSchema } from "./schemas";

export type TaskPriority = z.infer<typeof prioritySchema>;
export type TaskType = z.infer<typeof taskTypeSchema>;

export type BoardSummary = {
  id: number;
  name: string;
  createdAt: string;
};

export type TaskComment = {
  id: number;
  body: string;
  authorEmail: string;
  createdAt: string;
};

export type Task = {
  id: number;
  columnId: number;
  title: string;
  description: string;
  priority: TaskPriority;
  taskType: TaskType;
  assigneeName: string;
  createdAt: string;
  comments: TaskComment[];
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
