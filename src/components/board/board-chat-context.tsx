"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type BoardChatContextValue = {
  activeBoardId: number | null;
  activeBoardName: string;
  chatPanelVisible: boolean;
  /** Call from a board page so chat follows that board across navigation. */
  setBoardChatContext: (boardId: number, boardName: string) => void;
  openChatPanel: () => void;
  closeChatPanel: () => void;
  toggleChatPanel: () => void;
};

const BoardChatContext = createContext<BoardChatContextValue | null>(null);

export function BoardChatProvider({ children }: { children: ReactNode }) {
  const [activeBoardId, setActiveBoardId] = useState<number | null>(null);
  const [activeBoardName, setActiveBoardName] = useState("");
  const [chatPanelVisible, setChatPanelVisible] = useState(true);

  const setBoardChatContext = useCallback((boardId: number, boardName: string) => {
    setActiveBoardId(boardId);
    setActiveBoardName(boardName);
  }, []);

  const openChatPanel = useCallback(() => setChatPanelVisible(true), []);
  const closeChatPanel = useCallback(() => setChatPanelVisible(false), []);
  const toggleChatPanel = useCallback(
    () => setChatPanelVisible((v) => !v),
    [],
  );

  const value = useMemo(
    () => ({
      activeBoardId,
      activeBoardName,
      chatPanelVisible,
      setBoardChatContext,
      openChatPanel,
      closeChatPanel,
      toggleChatPanel,
    }),
    [
      activeBoardId,
      activeBoardName,
      chatPanelVisible,
      setBoardChatContext,
      openChatPanel,
      closeChatPanel,
      toggleChatPanel,
    ],
  );

  return (
    <BoardChatContext.Provider value={value}>
      {children}
    </BoardChatContext.Provider>
  );
}

export function useBoardChat() {
  const ctx = useContext(BoardChatContext);
  if (!ctx) {
    throw new Error("useBoardChat must be used within BoardChatProvider");
  }
  return ctx;
}
