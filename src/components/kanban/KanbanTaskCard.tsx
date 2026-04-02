"use client";

import { GripVertical, MessageSquareText, PanelRightOpen } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import type { BoardDetail, Task } from "@/lib/types";
import { addCommentAction, assignTaskAction } from "@/actions/tasks";
import { useLocale } from "@/i18n/locale-provider";
import { AssigneeAvatar } from "./AssigneeAvatar";
import { PriorityIcon } from "./PriorityIcon";
import { TaskTypeIcon } from "./TaskTypeIcon";

type Props = {
  task: Task;
  board: BoardDetail;
  isDragging: boolean;
  isPm: boolean;
  developerColumnSelectDisabled: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onMove: (columnId: number) => void;
  onDelete: () => void;
  onAfterMutation: () => void | Promise<void>;
  dataTourId?: string;
};

export function KanbanTaskCard({
  task,
  board,
  isDragging,
  isPm,
  developerColumnSelectDisabled,
  dragHandleProps,
  onMove,
  onDelete,
  onAfterMutation,
  dataTourId,
}: Props) {
  const { t } = useLocale();
  const commentsRef = useRef<HTMLDivElement>(null);
  const [assigneeDraft, setAssigneeDraft] = useState(task.assigneeName);
  const [commentBody, setCommentBody] = useState("");
  const [pending, startTransition] = useTransition();
  const [localError, setLocalError] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  function saveAssignee() {
    setLocalError(null);
    startTransition(async () => {
      const res = await assignTaskAction({
        taskId: task.id,
        assigneeName: assigneeDraft.trim(),
      });
      if (!res.ok) {
        setLocalError(res.message);
        return;
      }
      await onAfterMutation();
    });
  }

  function submitComment(e: React.FormEvent) {
    e.preventDefault();
    if (!commentBody.trim()) return;
    setLocalError(null);
    startTransition(async () => {
      const res = await addCommentAction({
        taskId: task.id,
        body: commentBody.trim(),
      });
      if (!res.ok) {
        setLocalError(res.message);
        return;
      }
      setCommentBody("");
      await onAfterMutation();
    });
  }

  function scrollToComments() {
    commentsRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    });
    window.requestAnimationFrame(() => {
      commentsRef.current?.querySelector("textarea")?.focus();
    });
  }

  const showColumnSelect = !developerColumnSelectDisabled;
  const priorityWord = t(`taskCard.${task.priority}`);
  const typeWord = t(`board.taskType.${task.taskType}`);

  return (
    <li
      data-task-card
      data-tour={dataTourId}
      className={`group/card relative rounded-lg border border-slate-200/90 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.06),0_1px_3px_rgba(15,23,42,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_8px_24px_rgba(15,23,42,0.1)] dark:border-slate-600/90 dark:bg-slate-900/90 dark:shadow-[0_1px_2px_rgba(0,0,0,0.2)] dark:hover:border-slate-500 dark:hover:shadow-[0_8px_24px_rgba(0,0,0,0.35)] ${
        isDragging
          ? "shadow-lg ring-2 ring-slate-200/80 dark:ring-slate-600/80"
          : ""
      }`}
    >
      <div className="pointer-events-none absolute right-2 top-9 z-10 flex gap-1 opacity-0 transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100 max-sm:pointer-events-auto max-sm:opacity-100">
        <button
          type="button"
          onClick={scrollToComments}
          className="pointer-events-auto rounded-md border border-slate-200/90 bg-white/95 p-1.5 text-slate-600 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          title={t("taskCard.comment")}
          aria-label={t("taskCard.commentAria")}
        >
          <MessageSquareText className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
        <button
          type="button"
          onClick={() => setDetailsOpen(true)}
          className="pointer-events-auto rounded-md border border-slate-200/90 bg-white/95 p-1.5 text-slate-600 shadow-sm backdrop-blur-sm transition-colors duration-200 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-600 dark:bg-slate-800/95 dark:text-slate-300 dark:hover:border-slate-500 dark:hover:bg-slate-700 dark:hover:text-slate-100"
          title={t("taskCard.details")}
          aria-label={t("taskCard.detailsAria")}
        >
          <PanelRightOpen className="h-3.5 w-3.5" strokeWidth={2} />
        </button>
      </div>

      {localError ? (
        <p className="mb-2 rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          {localError}
        </p>
      ) : null}
      <div className="flex gap-2">
        {dragHandleProps ? (
          <button
            type="button"
            {...dragHandleProps}
            className="mt-0.5 inline-flex h-7 w-7 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-slate-400 transition-colors duration-200 hover:bg-slate-100 hover:text-slate-600 active:cursor-grabbing dark:hover:bg-slate-800 dark:hover:text-slate-300"
            aria-label={t("taskCard.dragLabel")}
            title={t("taskCard.dragTitle")}
          >
            <GripVertical className="h-4 w-4" strokeWidth={2} />
          </button>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex gap-2">
            <TaskTypeIcon type={task.taskType} />
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 pr-16">
                <h4
                  className={`text-sm font-semibold leading-snug text-slate-900 dark:text-slate-100 ${developerColumnSelectDisabled ? "select-text" : ""}`}
                >
                  {task.title}
                </h4>
                <span className="flex shrink-0 items-center gap-1.5">
                  <PriorityIcon priority={task.priority} />
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {priorityWord}
                  </span>
                </span>
              </div>
              {task.description ? (
                <p
                  className={`mt-2 line-clamp-3 text-xs leading-relaxed text-slate-600 dark:text-slate-400 ${developerColumnSelectDisabled ? "select-text" : ""}`}
                >
                  {task.description}
                </p>
              ) : null}

              {isPm ? (
                <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2 dark:border-slate-700">
                  <label className="flex min-w-0 flex-1 flex-col gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    {t("taskCard.assignee")}
                    <input
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      value={assigneeDraft}
                      onChange={(e) => setAssigneeDraft(e.target.value)}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={saveAssignee}
                    className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-medium text-slate-800 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                  >
                    {t("taskCard.saveAssignee")}
                  </button>
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-3 flex items-end justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {showColumnSelect ? (
                <label className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="sr-only">{t("taskCard.moveColumn")}</span>
                  <select
                    className="max-w-[7rem] rounded border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-800 transition-colors duration-200 hover:border-slate-300 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:focus:border-sky-500 dark:focus:ring-sky-500/20"
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
              ) : (
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  {t("taskCard.dragHintDev")}
                </span>
              )}
              {isPm ? (
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-xs font-medium text-red-600 underline-offset-2 transition-colors duration-200 hover:text-red-700 hover:underline dark:text-red-400 dark:hover:text-red-300"
                >
                  {t("taskCard.delete")}
                </button>
              ) : null}
            </div>
            <AssigneeAvatar name={task.assigneeName} />
          </div>

          <div
            ref={commentsRef}
            id={`task-${task.id}-comments`}
            className="mt-3 scroll-mt-4 border-t border-slate-100 pt-2 dark:border-slate-700"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {t("taskCard.comments")}
            </p>
            <ul className="mt-2 max-h-24 space-y-1 overflow-y-auto text-xs text-slate-600 dark:text-slate-400">
              {task.comments.map((c) => (
                <li
                  key={c.id}
                  className="rounded bg-slate-50 px-2 py-1 dark:bg-slate-800/80"
                >
                  <span className="font-medium text-slate-700 dark:text-slate-200">
                    {c.authorEmail}
                  </span>
                  <span className="text-slate-400 dark:text-slate-500">
                    {" "}
                    · {c.createdAt}
                  </span>
                  <p className="mt-0.5 whitespace-pre-wrap">{c.body}</p>
                </li>
              ))}
            </ul>
            <form onSubmit={submitComment} className="mt-2 flex flex-col gap-1">
              <textarea
                className="rounded border border-slate-200 bg-white px-2 py-1 text-xs text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                rows={2}
                placeholder={t("taskCard.addCommentPlaceholder")}
                value={commentBody}
                disabled={pending}
                onChange={(e) => setCommentBody(e.target.value)}
              />
              <button
                type="submit"
                disabled={pending || !commentBody.trim()}
                className="self-end rounded bg-slate-800 px-2 py-1 text-xs font-medium text-white disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {t("taskCard.commentSubmit")}
              </button>
            </form>
          </div>
        </div>
      </div>

      {detailsOpen ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/45 p-4 backdrop-blur-[2px] dark:bg-black/55"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`task-detail-${task.id}`}
        >
          <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-6 shadow-[0_24px_64px_rgba(15,23,42,0.2)] dark:border-slate-600 dark:bg-slate-900 dark:shadow-[0_24px_64px_rgba(0,0,0,0.45)]">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-start gap-2">
                <TaskTypeIcon type={task.taskType} />
                <h2
                  id={`task-detail-${task.id}`}
                  className="text-lg font-bold leading-snug text-slate-900 dark:text-slate-100"
                >
                  {task.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                {t("taskCard.close")}
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <PriorityIcon priority={task.priority} />
              <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                {t("taskCard.priorityType", {
                  priority: priorityWord,
                  type: typeWord,
                })}
              </span>
            </div>
            {task.description ? (
              <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {task.description}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-slate-500 dark:text-slate-400">
                {t("taskCard.noDescription")}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-700">
              <button
                type="button"
                onClick={() => {
                  setDetailsOpen(false);
                  scrollToComments();
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
              >
                {t("taskCard.goComments")}
              </button>
              <button
                type="button"
                onClick={() => setDetailsOpen(false)}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
              >
                {t("taskCard.done")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </li>
  );
}
