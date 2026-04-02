"use client";

import { MessageSquare } from "lucide-react";
import { useSession } from "next-auth/react";
import { BoardChatPanel } from "@/components/board/BoardChatPanel";
import { useBoardChat } from "@/components/board/board-chat-context";
import { useUser } from "@/hooks/use-user";
import { useLocale } from "@/i18n/locale-provider";

export function GlobalBoardChatDock() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const { isPm, isDeveloper } = useUser();
  const {
    activeBoardId,
    activeBoardName,
    chatPanelVisible,
    closeChatPanel,
    openChatPanel,
  } = useBoardChat();

  const email = session?.user?.email ?? "Guest";
  const canChat = (isPm || isDeveloper) && activeBoardId !== null;

  if (!canChat) return null;

  return (
    <>
      {chatPanelVisible ? (
        <BoardChatPanel
          key={activeBoardId}
          boardId={activeBoardId!}
          userEmail={email}
          onClose={closeChatPanel}
          labels={{
            title: t("board.chatTitle"),
            boardCaption: t("board.chatBoardLabel", {
              name: activeBoardName || `#${activeBoardId}`,
            }),
            placeholder: t("board.chatPlaceholder"),
            send: t("board.chatSend"),
            empty: t("board.chatEmpty"),
            typingOne: t("board.typingOne"),
            typingMany: t("board.typingMany"),
            offline: t("board.socketOffline"),
            dragHint: t("board.videoDragHint"),
          }}
        />
      ) : (
        <button
          type="button"
          onClick={openChatPanel}
          className="fixed z-[93] flex min-h-12 touch-manipulation items-center justify-center gap-2 rounded-2xl border border-sky-500/80 bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-colors hover:bg-sky-500 left-[max(1rem,env(safe-area-inset-left))] right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] sm:right-auto sm:min-h-11 sm:w-auto sm:rounded-full sm:py-2.5 dark:bg-sky-600 dark:hover:bg-sky-500"
          title={t("board.chatReopen")}
        >
          <MessageSquare className="h-5 w-5 shrink-0 sm:h-4 sm:w-4" aria-hidden />
          <span className="truncate">{t("board.chatReopen")}</span>
        </button>
      )}
    </>
  );
}
