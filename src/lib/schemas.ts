import { z } from "zod";

export const prioritySchema = z.enum(["low", "medium", "high"]);

export const taskTypeSchema = z.enum(["bug", "story", "task"]);

export const createBoardSchema = z.object({
  name: z.string().min(1, "Name is required").max(200),
});

export const createColumnSchema = z.object({
  boardId: z.coerce.number().int().positive(),
  name: z.string().min(1).max(200),
  displayOrder: z.coerce.number().int().min(0),
});

export const createTaskSchema = z.object({
  columnId: z.coerce.number().int().positive(),
  title: z.string().min(1).max(500),
  description: z.string().max(10000).optional().default(""),
  priority: prioritySchema.optional().default("medium"),
  taskType: taskTypeSchema.optional().default("task"),
  assigneeName: z.string().max(120).optional().default(""),
});

export const patchTaskSchema = z
  .object({
    title: z.string().min(1).max(500).optional(),
    description: z.string().max(10000).optional(),
    columnId: z.coerce.number().int().positive().optional(),
    priority: prioritySchema.optional(),
    taskType: taskTypeSchema.optional(),
    assigneeName: z.string().max(120).optional(),
  })
  .refine(
    (o) =>
      o.title !== undefined ||
      o.description !== undefined ||
      o.columnId !== undefined ||
      o.priority !== undefined ||
      o.taskType !== undefined ||
      o.assigneeName !== undefined,
    { message: "At least one field required" },
  );

export const idParamSchema = z.coerce.number().int().positive();
