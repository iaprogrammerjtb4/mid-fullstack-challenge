"use client";

import { Phone, Video } from "lucide-react";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";
import { WorkspaceCallDock } from "@/components/admin/WorkspaceCallDock";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { useLocale } from "@/i18n/locale-provider";
import { apiJson } from "@/lib/client-api";
import type { UserRoleType } from "@/lib/roles";

type Member = {
  id: number;
  email: string;
  role: UserRoleType;
  isOnline: boolean;
};

export function TeamCallDirectory() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const myId = session?.user?.id ? Number(session.user.id) : NaN;

  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeCall, setActiveCall] = useState<{
    peerId: number;
    email: string;
    mode: "audio" | "video";
  } | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setError(null);
    }
    const res = await fetch("/api/team/members", { cache: "no-store" });
    const body = await apiJson<Member[]>(res);
    if (!body.ok) {
      if (!opts?.silent) {
        setMembers([]);
        setError(body.error.message);
      }
      return;
    }
    setMembers(body.data);
  }, []);

  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- mount fetch */
    void load();
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load({ silent: true }), 28_000);
    return () => window.clearInterval(id);
  }, [load]);

  if (members === null) {
    return (
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("settings.teamCallsLoading")}
        </p>
      </section>
    );
  }

  return (
    <>
      <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
          {t("settings.teamCallsTitle")}
        </h2>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("settings.teamCallsHint")}
        </p>
        {error ? (
          <p className="mt-3 text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        <ul className="mt-4 space-y-2">
          {members.map((m) => (
            <li
              key={m.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                  {m.email}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <PresenceBadge online={m.isOnline} />
                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    {m.role}
                    {m.id === myId ? ` · ${t("admin.usersYou")}` : ""}
                  </p>
                </div>
              </div>
              {m.id !== myId ? (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    type="button"
                    title={t("admin.usersCallVoiceTitle")}
                    onClick={() =>
                      setActiveCall({
                        peerId: m.id,
                        email: m.email,
                        mode: "audio",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500"
                  >
                    <Phone className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
                    {t("admin.usersCallVoice")}
                  </button>
                  <button
                    type="button"
                    title={t("admin.usersCallVideoTitle")}
                    onClick={() =>
                      setActiveCall({
                        peerId: m.id,
                        email: m.email,
                        mode: "video",
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 hover:border-violet-300 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-violet-500"
                  >
                    <Video className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
                    {t("admin.usersCallVideo")}
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      {activeCall ? (
        <WorkspaceCallDock
          key={`${activeCall.peerId}-${activeCall.mode}`}
          peerUserId={activeCall.peerId}
          peerEmail={activeCall.email}
          startWithVideo={activeCall.mode === "video"}
          onClose={() => setActiveCall(null)}
        />
      ) : null}
    </>
  );
}
