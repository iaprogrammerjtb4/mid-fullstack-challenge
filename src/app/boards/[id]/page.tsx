"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { BoardDetail, Task, TaskPriority } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];

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
  const [savingTask, setSavingTask] = useState(false);

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
    // Client-side fetch when `id` changes; `load` updates loading/board state after async I/O.
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

  if (loading && !board) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-zinc-500">Loading board…</p>
      </div>
    );
  }

  if (!loading && !board) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
        >
          ← Boards
        </Link>
        <p className="mt-4 text-red-600 dark:text-red-400">
          {error ?? "Board not found"}
        </p>
      </div>
    );
  }

  if (!board) {
    return (
      <div className="mx-auto max-w-6xl p-6">
        <p className="text-zinc-500">Loading board…</p>
      </div>
    );
  }

  const b = board;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6 p-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link
            href="/"
            className="text-sm font-medium text-zinc-600 underline dark:text-zinc-400"
          >
            ← All boards
          </Link>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {b.name}
          </h1>
          <p className="text-sm text-zinc-500">{b.createdAt}</p>
        </div>
        <button
          type="button"
          onClick={openNewTaskModal}
          disabled={b.columns.length === 0}
          className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
        >
          New task
        </button>
      </header>

      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}

      <section className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <h2 className="mb-3 text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Add column
        </h2>
        <form
          onSubmit={addColumn}
          className="flex flex-wrap items-end gap-3"
        >
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Name
            <input
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={colName}
              onChange={(e) => setColName(e.target.value)}
              placeholder="Column name"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-600 dark:text-zinc-400">
            Order
            <input
              type="number"
              min={0}
              className="w-24 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
              value={colOrder}
              onChange={(e) => setColOrder(e.target.value)}
            />
          </label>
          <button
            type="submit"
            disabled={addingCol}
            className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-900 dark:border-zinc-600 dark:text-zinc-100"
          >
            {addingCol ? "…" : "Add column"}
          </button>
        </form>
      </section>

      {b.columns.length === 0 ? (
        <p className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-6 py-12 text-center text-zinc-600 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-400">
          No columns yet. Add a column above to start the board, or run{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            bun run seed
          </code>{" "}
          /{" "}
          <code className="rounded bg-zinc-200 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            npm run seed
          </code>
          .
        </p>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {b.columns.map((col) => (
            <div
              key={col.id}
              className="flex w-72 shrink-0 flex-col rounded-xl border border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/80"
            >
              <div className="border-b border-zinc-200 px-3 py-2 dark:border-zinc-800">
                <h3 className="font-medium text-zinc-900 dark:text-zinc-100">
                  {col.name}
                </h3>
                <p className="text-xs text-zinc-500">Order {col.displayOrder}</p>
              </div>
              <ul className="flex flex-col gap-2 p-3">
                {col.tasks.length === 0 ? (
                  <li className="text-center text-xs text-zinc-500">
                    No tasks
                  </li>
                ) : (
                  col.tasks.map((task) => (
                    <li
                      key={task.id}
                      className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-700 dark:bg-zinc-950"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">
                          {task.title}
                        </span>
                        <span
                          className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium uppercase ${
                            task.priority === "high"
                              ? "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200"
                              : task.priority === "low"
                                ? "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
                                : "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200"
                          }`}
                        >
                          {task.priority}
                        </span>
                      </div>
                      {task.description ? (
                        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                          {task.description}
                        </p>
                      ) : null}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <label className="flex items-center gap-1 text-xs text-zinc-500">
                          Move
                          <select
                            className="rounded border border-zinc-300 bg-white px-1 py-1 text-xs text-zinc-900 dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100"
                            value={task.columnId}
                            onChange={(e) =>
                              moveTask(task.id, Number(e.target.value))
                            }
                          >
                            {b.columns.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button
                          type="button"
                          onClick={() => deleteTask(task.id)}
                          className="text-xs text-red-600 underline dark:text-red-400"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </div>
      )}

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
        >
          <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-800 dark:bg-zinc-950">
            <h2
              id="task-modal-title"
              className="text-lg font-semibold text-zinc-900 dark:text-zinc-50"
            >
              New task
            </h2>
            <form onSubmit={createTask} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Column
                <select
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Title
                <input
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Description
                <textarea
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                Priority
                <select
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
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
              <div className="mt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm text-zinc-700 dark:text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
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
