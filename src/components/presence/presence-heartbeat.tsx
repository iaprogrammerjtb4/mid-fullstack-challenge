"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { presenceHeartbeatAction } from "@/actions/presence";

const INTERVAL_MS = 35_000;

/**
 * Keeps `user_presence` updated while the user has the app open (any authed shell page).
 */
export function PresenceHeartbeat() {
  const { status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") return;

    function pulse() {
      void presenceHeartbeatAction();
    }

    pulse();

    const onVis = () => {
      if (document.visibilityState === "visible") pulse();
    };
    document.addEventListener("visibilitychange", onVis);
    const id = setInterval(pulse, INTERVAL_MS);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [status]);

  return null;
}
