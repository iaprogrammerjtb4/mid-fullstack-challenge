"use client";

import { Loader2, MonitorUp, Trash2, Users } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import {
  createCoworkRoomAction,
  deleteCoworkRoomAction,
  listCoworkRoomsAction,
  type CoworkRoomDTO,
} from "@/actions/cowork";
import { useLocale } from "@/i18n/locale-provider";
import { UserRole } from "@/lib/roles";
import type { BoardDetail } from "@/lib/types";

type Props = {
  board: BoardDetail;
  selectedCoworkRoomId: number | null;
  onSelectCoworkRoom: (coworkRoomId: number | null, title: string | null) => void;
};

export function CoworkingPanel({
  board,
  selectedCoworkRoomId,
  onSelectCoworkRoom,
}: Props) {
  const { t } = useLocale();
  const { data: session } = useSession();
  const myId = session?.user?.id ? Number(session.user.id) : NaN;
  const isPm = session?.user?.role === UserRole.PM;

  const [rooms, setRooms] = useState<CoworkRoomDTO[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [taskId, setTaskId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await listCoworkRoomsAction(board.id);
    if (!res.ok) {
      setLoadError(res.message);
      setRooms([]);
      return;
    }
    setRooms(res.data);
  }, [board.id]);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount fetch for room list */
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  const taskOptions = board.columns.flatMap((col) =>
    col.tasks.map((task) => ({
      id: task.id,
      label: `${task.title} · ${col.name}`,
    })),
  );

  async function createRoom(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || saving) return;
    setSaving(true);
    const tidParsed = taskId === "" ? NaN : Number(taskId);
    const taskIdPayload =
      Number.isFinite(tidParsed) && tidParsed > 0 ? tidParsed : null;
    const res = await createCoworkRoomAction({
      boardId: board.id,
      title: trimmed,
      taskId: taskIdPayload,
    });
    setSaving(false);
    if (!res.ok) {
      setLoadError(res.message);
      return;
    }
    setTitle("");
    setTaskId("");
    await load();
  }

  async function removeRoom(id: number) {
    setDeletingId(id);
    const res = await deleteCoworkRoomAction(board.id, id);
    setDeletingId(null);
    if (!res.ok) {
      setLoadError(res.message);
      return;
    }
    if (selectedCoworkRoomId === id) {
      onSelectCoworkRoom(null, null);
    }
    await load();
  }

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white/95 via-slate-50/80 to-sky-50/40 shadow-[0_4px_24px_rgba(15,23,42,0.06)] backdrop-blur-sm dark:border-slate-700/90 dark:from-slate-900/95 dark:via-slate-900/90 dark:to-sky-950/30 dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)]">
      <div className="border-b border-slate-200/80 bg-white/60 px-5 py-4 dark:border-slate-700/80 dark:bg-slate-900/50">
        <div className="flex flex-wrap items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-600/15 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300">
            <Users className="h-5 w-5" strokeWidth={1.75} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100">
              {t("cowork.title")}
            </h2>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
              {t("cowork.subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-sky-200/80 bg-sky-50/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-sky-800 dark:border-sky-800/60 dark:bg-sky-950/40 dark:text-sky-200">
            <MonitorUp className="h-3.5 w-3.5" aria-hidden />
            {t("cowork.badge")}
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-4">
        <div>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("cowork.pickRoom")}
          </p>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onSelectCoworkRoom(null, null)}
              className={`rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors ${
                selectedCoworkRoomId === null
                  ? "border-sky-500 bg-sky-50 text-sky-950 dark:border-sky-500 dark:bg-sky-950/50 dark:text-sky-100"
                  : "border-slate-200 bg-white/80 text-slate-800 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800/60 dark:text-slate-100 dark:hover:border-slate-500"
              }`}
            >
              {t("cowork.generalRoom")}
            </button>

            {rooms === null ? (
              <p className="flex items-center gap-2 py-2 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("cowork.loadingRooms")}
              </p>
            ) : (
              rooms.map((r) => (
                <div
                  key={r.id}
                  className={`flex items-stretch gap-2 rounded-xl border transition-colors ${
                    selectedCoworkRoomId === r.id
                      ? "border-sky-500 bg-sky-50 dark:border-sky-500 dark:bg-sky-950/50"
                      : "border-slate-200 bg-white/80 dark:border-slate-600 dark:bg-slate-800/60"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => onSelectCoworkRoom(r.id, r.title)}
                    className="min-w-0 flex-1 px-3 py-2.5 text-left text-sm font-medium text-slate-900 dark:text-slate-100"
                  >
                    <span className="block truncate">{r.title}</span>
                    {r.taskTitle ? (
                      <span className="mt-0.5 block truncate text-[11px] font-normal text-slate-500 dark:text-slate-400">
                        {t("cowork.linkedTask")}: {r.taskTitle}
                      </span>
                    ) : null}
                    <span className="mt-0.5 block text-[10px] text-slate-400 dark:text-slate-500">
                      {r.creatorEmail}
                    </span>
                  </button>
                  {(isPm || (!Number.isNaN(myId) && r.createdBy === myId)) ? (
                    <button
                      type="button"
                      disabled={deletingId === r.id}
                      onClick={() => void removeRoom(r.id)}
                      className="flex shrink-0 items-center justify-center border-l border-slate-200/80 px-2.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 dark:border-slate-600 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      title={t("cowork.deleteRoom")}
                    >
                      {deletingId === r.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                      ) : (
                        <Trash2 className="h-4 w-4" aria-hidden />
                      )}
                    </button>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        {loadError ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-800 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
            {loadError}
          </p>
        ) : null}

        <form
          onSubmit={(e) => void createRoom(e)}
          className="rounded-xl border border-dashed border-slate-300/90 bg-white/50 p-3 dark:border-slate-600 dark:bg-slate-800/40"
        >
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("cowork.newRoom")}
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
            <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {t("cowork.roomTitle")}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={120}
                placeholder={t("cowork.roomTitlePlaceholder")}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              />
            </label>
            <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
              {t("cowork.linkTaskOptional")}
              <select
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-100"
              >
                <option value="">{t("cowork.noTask")}</option>
                {taskOptions.map((opt) => (
                  <option key={opt.id} value={String(opt.id)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {saving ? t("cowork.creating") : t("cowork.create")}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
