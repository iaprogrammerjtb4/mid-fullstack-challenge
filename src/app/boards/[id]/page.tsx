"use client";

import type { ReactNode } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  closestCorners,
  type DragEndEvent,
  type DragOverEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { createColumnAction } from "@/actions/boards";
import { updateTaskStatusAction } from "@/actions/tasks";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { DraggableKanbanTaskCard } from "@/components/kanban/DraggableKanbanTaskCard";
import { TaskTypeIcon } from "@/components/kanban/TaskTypeIcon";
import { useUser } from "@/hooks/use-user";
import { useLocale } from "@/i18n/locale-provider";
import type { BoardDetail, Task, TaskPriority, TaskType } from "@/lib/types";
import { BoardCommunication } from "@/components/board/BoardCommunication";
import { CoworkingPanel } from "@/components/board/CoworkingPanel";
import { apiJson } from "@/lib/client-api";
import { useBoardRealtime } from "@/hooks/use-board-realtime";

const PRIORITIES: TaskPriority[] = ["low", "medium", "high"];
const TASK_TYPES: TaskType[] = ["task", "story", "bug"];

type DropHint = { columnId: number; insertIndex: number } | null;

function findTaskColumnId(board: BoardDetail, taskId: number): number | null {
  for (const col of board.columns) {
    if (col.tasks.some((t) => t.id === taskId)) return col.id;
  }
  return null;
}

function columnFromOverId(
  overId: UniqueIdentifier | undefined | null,
  board: BoardDetail,
): number | null {
  if (overId == null) return null;
  const id = String(overId);
  if (id.startsWith("col-")) {
    const n = Number(id.slice(4));
    return Number.isFinite(n) ? n : null;
  }
  if (id.startsWith("task-")) {
    const tid = Number(id.replace(/^task-/, ""));
    return findTaskColumnId(board, tid);
  }
  return null;
}

function BoardColumnDropZone({
  columnId,
  isHighlighted,
  children,
}: {
  columnId: number;
  isHighlighted: boolean;
  children: ReactNode;
}) {
  const { setNodeRef } = useDroppable({
    id: `col-${columnId}`,
    data: { type: "column", columnId },
  });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(18rem,calc(100vw-2rem))] shrink-0 snap-start flex-col rounded-xl border bg-slate-100/80 transition-all duration-200 sm:w-72 dark:bg-slate-800/60 ${
        isHighlighted
          ? "border-blue-400 shadow-[0_0_0_3px_rgba(59,130,246,0.12),0_0_28px_rgba(59,130,246,0.1)] dark:border-sky-500 dark:shadow-[0_0_0_3px_rgba(56,189,248,0.2),0_0_28px_rgba(56,189,248,0.12)]"
          : "border-slate-200/90 dark:border-slate-600/90"
      }`}
    >
      {children}
    </div>
  );
}

export default function BoardPage() {
  const { isPm, isDeveloper } = useUser();
  const { setMeta } = useDashboardMeta();
  const { t: tx } = useLocale();
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
  const [overColumnId, setOverColumnId] = useState<number | null>(null);
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const draggingActiveRef = useRef(false);

  const [coworkPick, setCoworkPick] = useState<{
    id: number | null;
    title: string | null;
  }>({ id: null, title: null });

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
  );

  const load = useCallback(
    async (opts?: { silent?: boolean }) => {
      const silent = opts?.silent === true;
      if (!silent) {
        setLoading(true);
        setBoard(null);
        setError(null);
      }
      if (!Number.isFinite(id)) {
        if (!silent) {
          setError(tx("board.invalidId"));
          setLoading(false);
          setBoard(null);
        }
        return;
      }
      const res = await fetch(`/api/boards/${id}`, { cache: "no-store" });
      const body = await apiJson<BoardDetail>(res);
      if (!silent) {
        setLoading(false);
      }
      if (!body.ok) {
        if (!silent) {
          setError(body.error.message);
          setBoard(null);
        }
        return;
      }
      setBoard(body.data);
    },
    [id, tx],
  );

  const refreshSilent = useCallback(() => load({ silent: true }), [load]);

  const { notifyOthers } = useBoardRealtime(
    Number.isFinite(id) && id > 0 ? id : null,
    refreshSilent,
    draggingActiveRef,
  );

  const afterBoardMutation = useCallback(async () => {
    await load({ silent: true });
    if (Number.isFinite(id) && id > 0) notifyOthers(id);
  }, [load, notifyOthers, id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount/transition fetch
    void load();
  }, [load]);

  useEffect(() => {
    if (!board) return;
    setMeta({
      title: board.name,
      subtitle: tx("board.metaCreated", { date: board.createdAt }),
    });
    return () => setMeta({ title: tx("meta.dashboard"), subtitle: undefined });
  }, [board, setMeta, tx]);

  function updateDropHintFromPointer(
    e: React.PointerEvent<HTMLElement>,
    columnId: number,
    tasks: Task[],
  ) {
    if (draggingId === null) return;
    const list = e.currentTarget;
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

  function handleDragOverBoard(e: DragOverEvent) {
    if (!board) {
      setOverColumnId(null);
      return;
    }
    const next = e.over ? columnFromOverId(e.over.id, board) : null;
    setOverColumnId(next);
  }

  async function addColumn(e: React.FormEvent) {
    e.preventDefault();
    if (!board || !colName.trim()) return;
    setAddingCol(true);
    setError(null);
    const order = Number.parseInt(colOrder, 10);
    const result = await createColumnAction({
      boardId: board.id,
      name: colName.trim(),
      displayOrder: Number.isFinite(order) ? order : 0,
    });
    setAddingCol(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setColName("");
    setColOrder(String((board.columns?.length ?? 0) + 1));
    await load({ silent: true });
    notifyOthers(board.id);
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
    if (taskColumnId === "" || !taskTitle.trim() || !board) return;
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
    await load({ silent: true });
    notifyOthers(board.id);
  }

  async function moveTask(taskId: number, columnId: number) {
    setError(null);
    const res = await updateTaskStatusAction({ taskId, columnId });
    if (!res.ok) {
      setError(res.message);
      return;
    }
    await load({ silent: true });
    notifyOthers(id);
  }

  async function deleteTask(taskId: number) {
    if (!confirm(tx("board.deleteTaskConfirm"))) return;
    setError(null);
    const res = await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    const body = await apiJson<{ deleted: boolean }>(res);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    await load({ silent: true });
    notifyOthers(id);
  }

  async function handleDragEnd(e: DragEndEvent) {
    draggingActiveRef.current = false;
    setDropHint(null);
    setOverColumnId(null);
    setActiveTask(null);
    const prevDragging = draggingId;
    setDraggingId(null);
    const { over, active } = e;
    if (!over || !board || prevDragging === null) return;
    const taskId = Number(String(active.id).replace(/^task-/, ""));
    const targetCol = columnFromOverId(over.id, board);
    if (targetCol === null) return;
    const fromCol = findTaskColumnId(board, taskId);
    if (fromCol === null || fromCol === targetCol) return;
    await moveTask(taskId, targetCol);
  }

  function handleDragCancel() {
    draggingActiveRef.current = false;
    setDraggingId(null);
    setDropHint(null);
    setOverColumnId(null);
    setActiveTask(null);
  }

  if (loading && !board) {
    return (
      <div
        className="px-4 py-6 sm:px-6 sm:py-8"
        data-tour="board-workspace"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tx("board.loading")}
        </p>
      </div>
    );
  }

  if (!loading && !board) {
    return (
      <div
        className="px-4 py-6 sm:px-6 sm:py-8"
        data-tour="board-workspace"
      >
        <Link
          href="/"
          className="inline-flex min-h-11 items-center text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {tx("board.boardsLinkShort")}
        </Link>
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">
          {error ?? tx("board.notFound")}
        </p>
      </div>
    );
  }

  if (!board) {
    return (
      <div
        className="px-4 py-6 sm:px-6 sm:py-8"
        data-tour="board-workspace"
      >
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {tx("board.loading")}
        </p>
      </div>
    );
  }

  const b = board;
  const firstTourTaskId = b.columns[0]?.tasks[0]?.id;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={({ active }) => {
        draggingActiveRef.current = true;
        const t = active.data.current?.task as Task | undefined;
        setDraggingId(t?.id ?? null);
        setActiveTask(t ?? null);
      }}
      onDragOver={handleDragOverBoard}
      onDragEnd={(ev) => void handleDragEnd(ev)}
      onDragCancel={handleDragCancel}
    >
      <div
        data-tour="board-workspace"
        className="px-4 py-4 sm:px-6 sm:py-6"
      >
        <div className="mx-auto max-w-7xl">
          <div className="mb-4 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <Link
              href="/"
              className="inline-flex min-h-11 max-w-fit items-center text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900 active:text-blue-950 dark:text-sky-400 dark:hover:text-sky-300"
            >
              {tx("board.allBoards")}
            </Link>
            <div className="flex w-full min-w-0 flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              <BoardCommunication
                boardId={b.id}
                boardName={b.name}
                isPm={isPm}
                isDeveloper={isDeveloper}
                coworkRoomId={coworkPick.id}
                coworkRoomTitle={coworkPick.title}
              />
              {isPm ? (
                <button
                  type="button"
                  data-tour="new-task-btn"
                  onClick={openNewTaskModal}
                  disabled={b.columns.length === 0}
                  className="flow-btn-primary min-h-11 w-full rounded-xl px-4 text-sm font-semibold shadow-sm transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                >
                  {tx("board.newTask")}
                </button>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
              {error}
            </p>
          ) : null}

          {isPm || isDeveloper ? (
            <CoworkingPanel
              board={b}
              selectedCoworkRoomId={coworkPick.id}
              onSelectCoworkRoom={(id, title) => setCoworkPick({ id, title })}
            />
          ) : null}

          {isPm ? (
            <section className="mb-6 rounded-xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)]">
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                {tx("board.addColumn")}
              </h2>
              <form
                onSubmit={addColumn}
                className="flex flex-wrap items-end gap-3"
              >
                <label className="flex flex-col gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {tx("board.columnName")}
                  <input
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    value={colName}
                    onChange={(e) => setColName(e.target.value)}
                    placeholder={tx("board.columnNamePlaceholder")}
                  />
                </label>
                <label className="flex flex-col gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                  {tx("board.columnOrder")}
                  <input
                    type="number"
                    min={0}
                    className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    value={colOrder}
                    onChange={(e) => setColOrder(e.target.value)}
                  />
                </label>
                <button
                  type="submit"
                  disabled={addingCol}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700"
                >
                  {addingCol ? tx("board.adding") : tx("board.addColumnSubmit")}
                </button>
              </form>
            </section>
          ) : null}

          {b.columns.length === 0 ? (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-600 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-400 dark:shadow-[0_1px_2px_rgba(0,0,0,0.15)]">
              {tx("board.noColumns")}{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                bun run seed
              </code>{" "}
              /{" "}
              <code className="rounded bg-slate-100 px-1.5 py-0.5 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                npm run seed
              </code>
              .
            </p>
          ) : (
            <div className="-mx-1 flex snap-x snap-mandatory gap-3 overflow-x-auto overflow-y-visible pb-4 pl-1 pr-4 [scrollbar-gutter:stable] [-webkit-overflow-scrolling:touch] sm:mx-0 sm:gap-4 sm:pl-0 sm:pr-0">
              {b.columns.map((col) => (
                <BoardColumnDropZone
                  key={col.id}
                  columnId={col.id}
                  isHighlighted={overColumnId === col.id && draggingId !== null}
                >
                  <div className="border-b border-slate-200/90 bg-white/90 px-3 py-3 dark:border-slate-600/80 dark:bg-slate-900/70">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                      {col.name}
                    </h3>
                    <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      {tx("board.tasksCount", {
                        count: col.tasks.length,
                        order: col.displayOrder,
                      })}
                    </p>
                  </div>

                  <ul
                    className="flex min-h-[120px] flex-col gap-2 p-3 transition-all duration-200"
                    onPointerMove={(e) =>
                      updateDropHintFromPointer(e, col.id, col.tasks)
                    }
                    onPointerLeave={(e) => {
                      const next = e.relatedTarget;
                      if (next instanceof Node && e.currentTarget.contains(next)) {
                        return;
                      }
                      setDropHint(null);
                    }}
                  >
                    {col.tasks.length === 0 ? (
                      <li
                        className={`flex min-h-[100px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-3 py-6 text-center text-xs font-medium transition-all duration-200 ${
                          draggingId !== null
                            ? "scale-[1.02] border-blue-400 bg-blue-50/60 text-blue-900 dark:border-sky-500 dark:bg-sky-950/40 dark:text-sky-100"
                            : "border-slate-300/60 bg-white/50 text-slate-500 dark:border-slate-600/60 dark:bg-slate-900/40 dark:text-slate-400"
                        }`}
                      >
                        <span
                          className="mb-1 text-slate-400 dark:text-slate-500"
                          aria-hidden
                        >
                          ↓
                        </span>
                        {tx("board.dropHere")}
                      </li>
                    ) : (
                      col.tasks.map((task, idx) => (
                        <div key={task.id}>
                          {dropHint?.columnId === col.id &&
                          dropHint.insertIndex === idx &&
                          draggingId !== null ? (
                            <div
                              className="mb-2 h-2 rounded-full bg-blue-500/90 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] transition-all duration-200 dark:bg-sky-500 dark:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"
                              aria-hidden
                            />
                          ) : null}
                          <DraggableKanbanTaskCard
                            task={task}
                            board={b}
                            isPm={isPm}
                            developerColumnSelectDisabled={isDeveloper}
                            tourTaskCard={task.id === firstTourTaskId}
                            onMove={(columnId) => moveTask(task.id, columnId)}
                            onDelete={() => deleteTask(task.id)}
                            onAfterMutation={afterBoardMutation}
                          />
                        </div>
                      ))
                    )}
                    {col.tasks.length > 0 &&
                    dropHint?.columnId === col.id &&
                    dropHint.insertIndex === col.tasks.length &&
                    draggingId !== null ? (
                      <div
                        className="h-2 rounded-full bg-blue-500/90 shadow-[0_0_0_4px_rgba(59,130,246,0.15)] transition-all duration-200 dark:bg-sky-500 dark:shadow-[0_0_0_4px_rgba(56,189,248,0.2)]"
                        aria-hidden
                      />
                    ) : null}
                  </ul>
                </BoardColumnDropZone>
              ))}
            </div>
          )}
        </div>
      </div>

      <DragOverlay dropAnimation={{ duration: 180, easing: "cubic-bezier(0.25,1,0.5,1)" }}>
        {activeTask ? (
          <div className="w-[min(18rem,calc(100vw-2rem))] cursor-grabbing rounded-xl border border-slate-200 bg-white p-3 shadow-2xl ring-2 ring-blue-500/20 sm:w-72 dark:border-slate-600 dark:bg-slate-800 dark:ring-sky-500/30">
            <div className="flex items-start gap-2">
              <TaskTypeIcon type={activeTask.taskType} />
              <p className="text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100">
                {activeTask.title}
              </p>
            </div>
          </div>
        ) : null}
      </DragOverlay>

      {modalOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] transition-all duration-200 sm:items-center sm:p-4 dark:bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby="task-modal-title"
        >
          <div className="max-h-[min(92dvh,44rem)] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.15)] sm:rounded-xl sm:p-6 dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_20px_50px_rgba(0,0,0,0.45)]">
            <h2
              id="task-modal-title"
              className="text-lg font-bold text-slate-900 dark:text-slate-100"
            >
              {tx("board.modalNewTask")}
            </h2>
            <form onSubmit={createTask} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tx("board.column")}
                <select
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
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
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tx("board.title")}
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                  value={taskTitle}
                  onChange={(e) => setTaskTitle(e.target.value)}
                  required
                />
              </label>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tx("board.description")}
                <textarea
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                  rows={3}
                  value={taskDescription}
                  onChange={(e) => setTaskDescription(e.target.value)}
                />
              </label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {tx("board.type")}
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    value={taskType}
                    onChange={(e) => setTaskType(e.target.value as TaskType)}
                  >
                    {TASK_TYPES.map((ty) => (
                      <option key={ty} value={ty}>
                        {tx(`board.taskType.${ty}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                  {tx("board.priority")}
                  <select
                    className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                    value={taskPriority}
                    onChange={(e) =>
                      setTaskPriority(e.target.value as TaskPriority)
                    }
                  >
                    {PRIORITIES.map((pr) => (
                      <option key={pr} value={pr}>
                        {tx(`taskCard.${pr}`)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="flex flex-col gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
                {tx("board.assigneeOptional")}
                <input
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
                  value={assigneeName}
                  onChange={(e) => setAssigneeName(e.target.value)}
                  placeholder={tx("board.assigneePlaceholder")}
                />
              </label>
              <div className="mt-2 flex flex-col-reverse gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex-row sm:justify-end sm:pb-0">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="min-h-11 rounded-xl px-4 text-sm font-medium text-slate-700 transition-colors duration-200 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  {tx("board.cancel")}
                </button>
                <button
                  type="submit"
                  disabled={savingTask}
                  className="flow-btn-primary min-h-11 rounded-xl px-4 text-sm font-semibold transition-all duration-200"
                >
                  {savingTask ? tx("board.saving") : tx("board.create")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </DndContext>
  );
}
