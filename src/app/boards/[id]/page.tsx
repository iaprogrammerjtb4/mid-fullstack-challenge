"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { KanbanTaskCard } from "@/components/kanban/KanbanTaskCard";
import type { BoardDetail, Task, TaskPriority, TaskType } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const TASK_TYPES: TaskType[] = ["task", "story", "bug"];

type DropHint = { columnId: number; insertIndex: number } | null;

export default function BoardPage() {
  const params = useParams();
  const id = Number(params.id);
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [colName, setColName] = useState("");
  const [colOrder, setColOrder] = useState("0");
  const [addingCol, setAddingCol] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [taskColumnId, setTaskColumnId] = useState<number | "">("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskPriority, setTaskPriority] = useState<TaskPriority>("medium");
  const [taskType, setTaskType] = useState<TaskType>("task");
  const [assigneeName, setAssigneeName] = useState("");
  const [savingTask, setSavingTask] = useState(false);

  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropHint, setDropHint] = useState<DropHint>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setBoard(null);
    setError(null);
    if (!Number.isFinite(id)) {
      setError("Invalid board id");
      setLoading(false);
      setBoard(null);
      return;
    }
    const res = await fetch(`/api/boards/${id}`);
    const body = await apiJson<BoardDetail>(res);
    if (!body.ok) {
      setError(body.error.message);
      setBoard(null);
      setLoading(false);
      return;
    }
    setBoard(body.data);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount/transition fetch
    void load();
  }, [load]);

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!board || !colName.trim()) return;
    setAddingCol(true);
    setError(null);
    const order = Number.parseInt(colOrder, 10);
    const res = await fetch("/api/columns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        boardId: board.id,
        name: colName.trim(),
        displayOrder: Number.isFinite(order) ? order : 0,
      }),
    });
    const body = await apiJson<unknown>(res);
    setAddingCol(false);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    setColName("");
    setColOrder(String((board.columns?.length ?? 0) + 1));
    await load();
  }

  function openNewTaskModal() {
    if (board?.columns.length) {
      setTaskColumnId(board.columns[0].id);
    }
    setTaskTitle("");
    setTaskDescription("");
    setTaskPriority("medium");
    setTaskType("task");
    setAssigneeName("");
    setModalOpen(true);
  }

  async function createTask(e: React.FormEvent) {
    e.preventDefault();
    if (taskColumnId === "" || !taskTitle.trim()) return;
    setSavingTask(true);
    setError(null);
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        columnId: taskColumnId,
        title: taskTitle.trim(),
        description: taskDescription,
        priority: taskPriority,
        taskType,
        assigneeName: assigneeName.trim(),
      }),
    });
    const body = await apiJson<Task>(res);
    setSavingTask(false);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    setModalOpen(false);
    await load();
  }

  async function moveTask(taskId: number, columnId: number) {
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ columnId }),
    });
    const body = await apiJson<Task>(res);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    await load();
  }

  async function deleteTask(taskId: number) {
    if (!confirm("Delete this task?")) return;
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const body = await apiJson<{ deleted: boolean }>(res);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    await load();
  }

  function parseDragPayload(e: React.DragEvent): {
    taskId: number;
    sourceColumnId: number;
  } | null {
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return null;
      const p = JSON.parse(raw) as { taskId?: number; sourceColumnId?: number };
      if (
        typeof p.taskId !== "number" ||
        typeof p.sourceColumnId !== "number"
      )
        return null;
      return { taskId: p.taskId, sourceColumnId: p.sourceColumnId };
    } catch {
      return null;
    }
  }

  function handleColumnDragOver(
    e: React.DragEvent,
    columnId: number,
    tasks: Task[],
  ) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const list = e.currentTarget as HTMLElement;
    const cards = list.querySelectorAll<HTMLElement>("[data-task-card]");
    let insertIndex = tasks.length;
    for (let i = 0; i < cards.length; i++) {
      const el = cards[i];
      const r = el.getBoundingClientRect();
      const mid = r.top + r.height / 2;
      if (e.clientY < mid) {
        insertIndex = i;
        break;
      }
      insertIndex = i + 1;
    }
    setDropHint({ columnId, insertIndex });
  }

  async function handleColumnDrop(e: React.DragEvent, targetColumnId: number) {
    e.preventDefault();
    setDropHint(null);
    const payload = parseDragPayload(e);
    if (!payload) return;
    if (payload.sourceColumnId === targetColumnId) {
      setDraggingId(null);
      return;
    }
    await moveTask(payload.taskId, targetColumnId);
    setDraggingId(null);
  }

  function handleDragStart(task: Task) {
    return (e: React.DragEvent) => {
      e.dataTransfer.setData(
        "application/json",
        JSON.stringify({
          taskId: task.id,
          sourceColumnId: task.columnId,
        }),
      );
      e.dataTransfer.effectAllowed = "move";
      setDraggingId(task.id);
    };
  }

  function handleDragEnd() {
    setDraggingId(null);
    setDropHint(null);
  }

  if (loading && !board) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-slate-500">Loading board…</p>
        </div>
      </div>
    );
  }

  if (!loading && !board) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/"
            className="text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900"
          >
            ← Boards
          </Link>
          <p className="mt-4 text-sm text-red-600">
            {error ?? "Board not found"}
          </p>
        </div>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="min-h-screen bg-[#F4F5F7] px-6 py-8">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm text-slate-500">Loading board…</p>
        </div>
      </div>
    );
  }

  const b = board;

  return (
    <div className="min-h-screen bg-[#F4F5F7]">
      <header className="border-b border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-end justify-between gap-4 px-6 py-5">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900"
            >
              ← All boards
            </Link>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
              {b.name}
            </h1>
            <p className="mt-1 text-xs font-medium text-slate-500">
              Created {b.createdAt}
            </p>
          </div>
          <button
            type="button"
            onClick={openNewTaskModal}
            disabled={b.columns.length === 0}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all duration-200 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            New task
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        {error ? (
          <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <section className="mb-6 rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Add column
          </h2>
          <form
            onSubmit={addColumn}
            className="flex flex-wrap items-end gap-3"
          >
            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              Name
              <input
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={colName}
                onChange={(e) => setColName(e.target.value)}
                placeholder="Column name"
              />
            </label>
            <label className="flex flex-col gap-2 text-xs font-medium text-slate-600">
              Order
              <input
                type="number"
                min={0}
                className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                value={colOrder}
                onChange={(e) => setColOrder(e.target.value)}
              />
            </label>
            <button
              type="submit"
              disabled={addingCol}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
            >
              {addingCol ? "…" : "Add column"}
            </button>
          </form>
        </section>

        {b.columns.length === 0 ? (
          <p className="rounded-lg border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            No columns yet. Add a column above to start the board, or run{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
              bun run seed
            </code>{" "}
            /{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800">
              npm run seed
            </code>
            .
          </p>
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-4">
            {b.columns.map((col) => (
              <div
                key={col.id}
                className={`flex w-72 shrink-0 flex-col rounded-lg border bg-slate-100/80 transition-all duration-200 ${
                  dropHint?.columnId === col.id && draggingId !== null
                    ? "border-blue-400/80 ring-2 ring-blue-500/15"
                    : "border-slate-200/90"
                }`}
              >
                <div className="border-b border-slate-200/90 bg-white/90 px-3 py-3">
                  <h3 className="text-sm font-bold text-slate-900">
                    {col.name}
                  </h3>
                  <p className="text-[11px] font-medium text-slate-500">
                    {col.tasks.length} tasks · Order {col.displayOrder}
                  </p>
                </div>

                <ul
                  className="flex min-h-[120px] flex-col gap-2 p-3 transition-all duration-200"
                  onDragOver={(e) => handleColumnDragOver(e, col.id, col.tasks)}
                  onDragLeave={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                      setDropHint(null);
                    }
                  }}
                  onDrop={(e) => handleColumnDrop(e, col.id)}
                >
                  {col.tasks.length === 0 ? (
                    <li
                      className={`flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-6 text-center text-xs font-medium transition-all duration-200 ${
                        draggingId !== null
                          ? "border-blue-300 bg-blue-50/50 text-blue-800"
                          : "border-slate-300/60 bg-white/50 text-slate-500"
                      }`}
                    >
                      <span className="mb-1 text-slate-400" aria-hidden>
                        ↓
                      </span>
                      Drop tasks here
                    </li>
                  ) : (
                    col.tasks.map((task, idx) => (
                      <div key={task.id}>
                        {dropHint?.columnId === col.id &&
                        dropHint.insertIndex === idx &&
                        draggingId !== null ? (
                          <div
                            className="mb-2 h-1 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)] transition-all duration-200"
                            aria-hidden
                          />
                        ) : null}
                        <KanbanTaskCard
                          task={task}
                          board={b}
                          isDragging={draggingId === task.id}
                          onDragStart={handleDragStart(task)}
                          onDragEnd={handleDragEnd}
                          onMove={(columnId) => moveTask(task.id, columnId)}
                          onDelete={() => deleteTask(task.id)}
                        />
                      </div>
                    ))
                  )}
                  {col.tasks.length > 0 &&
                  dropHint?.columnId === col.id &&
                  dropHint.insertIndex === col.tasks.length &&
                  draggingId !== null ? (
                    <div
                      className="h-1 rounded-full bg-blue-500 shadow-[0_0_0_3px_rgba(59,130,246,0.2)] transition-all duration-200"
                      aria-hidden
                    />
                  ) : null}
                </ul>
              </div>
            ))}
          </div>
        )}
      </main>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-[1px] transition-all duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
        >
          <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-[0_20px_50px_rgba(15,23,42,0.15)]">
            <h2
              id="task-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              New task
            </h2>
            <form onSubmit={createTask} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Column
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={taskColumnId === "" ? "" : taskColumnId}
                  onChange={(e) =>
                    setTaskColumnId(Number(e.target.value) as number)
                  }
                  required
                >
                  {b.columns.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Title
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Description
                <textarea
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Type
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                  >
                    {TASK_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                  Priority
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as TaskPriority)
                    }
                  >
                    {PRIORITIES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
                Assignee (optional)
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder="e.g. Alex Kim"
                />
              </label>
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:opacity-50"
                >
                  {savingTask ? "Saving…" : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
