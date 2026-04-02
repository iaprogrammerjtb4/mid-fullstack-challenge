"use client";

import { MessageSquare, Radio } from "lucide-react";
import { useEffect } from "react";
import { useBoardChat } from "@/components/board/board-chat-context";
import { VoiceRoom } from "@/components/board/VoiceRoom";
import { useLocale } from "@/i18n/locale-provider";

type Props = {
  boardId: number;
  boardName: string;
  isPm: boolean;
  isDeveloper: boolean;
  coworkRoomId: number | null;
  coworkRoomTitle: string | null;
};

export function BoardCommunication({
  boardId,
  boardName,
  isPm,
  isDeveloper,
  coworkRoomId,
  coworkRoomTitle,
}: Props) {
  const { t } = useLocale();
  const {
    setBoardChatContext,
    chatPanelVisible,
    toggleChatPanel,
  } = useBoardChat();

  const canRtc = isPm || isDeveloper;

  useEffect(() => {
    if (!canRtc) return;
    setBoardChatContext(boardId, boardName);
  }, [boardId, boardName, setBoardChatContext, canRtc]);

  if (!canRtc) return null;

  return (
    <>
      <div className="flex w-full min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-stretch">
        <span className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold leading-snug text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Radio
            className="h-4 w-4 shrink-0 text-sky-600 dark:text-sky-400"
            aria-hidden
          />
          <span className="line-clamp-2 sm:line-clamp-none">
            {t("voiceRoom.joinHint")}
          </span>
        </span>
        <button
          type="button"
          onClick={() => toggleChatPanel()}
          className={`inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-2 rounded-xl border px-4 text-sm font-semibold shadow-sm transition-colors sm:w-auto ${
            chatPanelVisible
              ? "border-sky-500 bg-sky-600 text-white dark:bg-sky-600"
              : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500"
          }`}
        >
          <MessageSquare className="h-4 w-4 shrink-0" aria-hidden />
          {chatPanelVisible ? t("board.chatHide") : t("board.chatShow")}
        </button>
      </div>

      <VoiceRoom
        key={`${boardId}-${coworkRoomId ?? "main"}`}
        boardId={boardId}
        boardName={boardName}
        isHost={isPm}
        coworkRoomId={coworkRoomId}
        coworkRoomTitle={coworkRoomTitle}
      />

    </>
  );
}
