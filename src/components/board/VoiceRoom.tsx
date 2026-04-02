"use client";

import "@livekit/components-styles";

import {
  GridLayout,
  LiveKitRoom,
  ParticipantName,
  ParticipantTile,
  RoomAudioRenderer,
  useConnectionState,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTrackRefContext,
  useTracks,
} from "@livekit/components-react";
import {
  ChevronDown,
  ChevronUp,
  Loader2,
  Mic,
  MicOff,
  MonitorUp,
  PhoneOff,
  Radio,
  UserRound,
  Video,
  VideoOff,
  VolumeX,
} from "lucide-react";
import { useCallback, useState } from "react";
import {
  ConnectionState,
  isLocalParticipant,
  Track,
} from "livekit-client";
import {
  muteRemoteParticipantMicAction,
  requestLiveKitTokenAction,
} from "@/actions/livekit";
import { useLocale } from "@/i18n/locale-provider";

type Labels = {
  join: string;
  joining: string;
  leave: string;
  expand: string;
  minimize: string;
  micOn: string;
  micOff: string;
  camOn: string;
  camOff: string;
  share: string;
  hostMute: string;
  mutedRemote: string;
  muteFailed: string;
  configure: string;
  missingPublicUrl: string;
  liveMini: string;
};

type VoiceRoomProps = {
  boardId: number;
  boardName: string;
  isHost: boolean;
  /** When set, LiveKit room is scoped to this cowork sala. */
  coworkRoomId: number | null;
  coworkRoomTitle: string | null;
};

function GlassParticipantCell() {
  const trackRef = useTrackRefContext();
  const participant = trackRef.participant;
  const speaking = useIsSpeaking(participant);

  return (
    <div
      className={`relative overflow-hidden rounded-xl transition-[box-shadow,ring] duration-200 ${
        speaking
          ? "shadow-[0_0_24px_rgba(52,211,153,0.35)] ring-2 ring-emerald-400/90"
          : "ring-1 ring-white/15"
      }`}
    >
      <ParticipantTile
        trackRef={trackRef}
        disableSpeakingIndicator
        className="h-full w-full [&_.lk-participant-metadata-video]:hidden"
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent px-2 pb-1.5 pt-6">
        <div className="flex items-center gap-1.5 truncate text-[11px] font-medium text-white/95">
          <UserRound className="h-3 w-3 shrink-0 text-white/70" aria-hidden />
          <ParticipantName participant={participant} className="truncate" />
          {speaking ? (
            <span
              className="ml-auto shrink-0 text-[10px] font-bold text-emerald-300"
              aria-label="Speaking"
            >
              ●
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function VoiceRoomToolbar({
  boardId,
  coworkRoomId,
  isHost,
  labels,
}: {
  boardId: number;
  coworkRoomId: number | null;
  isHost: boolean;
  labels: Labels;
}) {
  const room = useRoomContext();
  const {
    localParticipant,
    isMicrophoneEnabled,
    isCameraEnabled,
    isScreenShareEnabled,
  } = useLocalParticipant();
  const participants = useParticipants();
  const [muteBusy, setMuteBusy] = useState<string | null>(null);

  const remotes = participants.filter((p) => !isLocalParticipant(p));

  const leave = useCallback(() => {
    room.disconnect();
  }, [room]);

  const muteRemote = useCallback(
    async (identity: string) => {
      setMuteBusy(identity);
      const res = await muteRemoteParticipantMicAction(
        boardId,
        identity,
        coworkRoomId ?? undefined,
      );
      setMuteBusy(null);
      if (!res.ok) {
        window.alert(`${labels.muteFailed}: ${res.message}`);
      }
    },
    [boardId, coworkRoomId, labels.muteFailed],
  );

  return (
    <div className="flex flex-col gap-3 border-t border-white/10 px-3 py-3">
      {isHost && remotes.length > 0 ? (
        <div className="max-h-24 space-y-1 overflow-y-auto rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-white/50">
            {labels.hostMute}
          </p>
          <ul className="space-y-1">
            {remotes.map((p) => (
              <li
                key={p.identity}
                className="flex items-center justify-between gap-2 text-xs text-white/90"
              >
                <span className="truncate">{p.name || p.identity}</span>
                <button
                  type="button"
                  disabled={muteBusy === p.identity}
                  onClick={() => void muteRemote(p.identity)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md bg-white/10 px-2 py-1 text-[10px] font-semibold text-rose-200 transition-colors hover:bg-rose-500/30 disabled:opacity-50"
                >
                  <VolumeX className="h-3 w-3" aria-hidden />
                  {muteBusy === p.identity ? "…" : labels.mutedRemote}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="flex items-center justify-center gap-2">
        <button
          type="button"
          onClick={() => void localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)}
          title={isMicrophoneEnabled ? labels.micOff : labels.micOn}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition-colors ${
            isMicrophoneEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-amber-600/90 text-white shadow-lg shadow-amber-900/40"
          }`}
        >
          {isMicrophoneEnabled ? (
            <Mic className="h-5 w-5" aria-hidden />
          ) : (
            <MicOff className="h-5 w-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() => void localParticipant.setCameraEnabled(!isCameraEnabled)}
          title={isCameraEnabled ? labels.camOff : labels.camOn}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition-colors ${
            isCameraEnabled
              ? "bg-white/15 text-white hover:bg-white/25"
              : "bg-amber-600/90 text-white shadow-lg shadow-amber-900/40"
          }`}
        >
          {isCameraEnabled ? (
            <Video className="h-5 w-5" aria-hidden />
          ) : (
            <VideoOff className="h-5 w-5" aria-hidden />
          )}
        </button>
        <button
          type="button"
          onClick={() =>
            void localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
          }
          title={labels.share}
          className={`flex h-11 w-11 items-center justify-center rounded-full border border-white/10 transition-colors ${
            isScreenShareEnabled
              ? "bg-sky-600 text-white shadow-lg shadow-sky-900/40"
              : "bg-white/15 text-white hover:bg-white/25"
          }`}
        >
          <MonitorUp className="h-5 w-5" aria-hidden />
        </button>
        <button
          type="button"
          onClick={leave}
          title={labels.leave}
          className="ml-1 flex h-11 w-11 items-center justify-center rounded-full bg-red-600 text-white shadow-lg shadow-red-900/30 transition-colors hover:bg-red-500"
        >
          <PhoneOff className="h-5 w-5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function VoiceMiniBar({ labels }: { labels: Pick<Labels, "leave" | "liveMini"> }) {
  const room = useRoomContext();
  return (
    <div className="flex flex-1 items-center justify-center gap-3 px-3 py-2">
      <p className="flex-1 truncate text-center text-[11px] text-white/55">
        {labels.liveMini}
      </p>
      <button
        type="button"
        onClick={() => room.disconnect()}
        title={labels.leave}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500"
      >
        <PhoneOff className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}

function VoiceRoomSession({
  boardId,
  coworkRoomId,
  isHost,
  labels,
  expanded,
}: {
  boardId: number;
  coworkRoomId: number | null;
  isHost: boolean;
  labels: Labels;
  expanded: boolean;
}) {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  return (
    <>
      <RoomAudioRenderer />
      {expanded ? (
        <>
          <VoiceRoomConnecting labels={{ joining: labels.joining }} />
          <div className="min-h-[140px] flex-1 overflow-hidden px-2 pb-2 pt-2">
            <GridLayout
              tracks={tracks}
              className="h-full gap-2 [&_.lk-focus-toggle-button]:hidden"
            >
              <GlassParticipantCell />
            </GridLayout>
          </div>
          <VoiceRoomToolbar
            boardId={boardId}
            coworkRoomId={coworkRoomId}
            isHost={isHost}
            labels={labels}
          />
        </>
      ) : (
        <VoiceMiniBar labels={{ leave: labels.leave, liveMini: labels.liveMini }} />
      )}
    </>
  );
}

function VoiceRoomConnecting({ labels }: { labels: { joining: string } }) {
  const room = useRoomContext();
  const state = useConnectionState(room);
  if (state === ConnectionState.Connected) return null;
  return (
    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-slate-950/70 backdrop-blur-sm">
      <Loader2 className="h-8 w-8 animate-spin text-sky-400" aria-hidden />
      <p className="text-xs font-medium text-white/80">{labels.joining}</p>
    </div>
  );
}

export function VoiceRoom({
  boardId,
  boardName,
  isHost,
  coworkRoomId,
  coworkRoomTitle,
}: VoiceRoomProps) {
  const { t } = useLocale();
  const [expanded, setExpanded] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const serverUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL?.trim() ?? "";

  const labels: Labels = {
    join: t("voiceRoom.join"),
    joining: t("voiceRoom.joining"),
    leave: t("voiceRoom.leave"),
    expand: t("voiceRoom.expand"),
    minimize: t("voiceRoom.minimize"),
    micOn: t("board.unmute"),
    micOff: t("board.mute"),
    camOn: t("board.cameraOn"),
    camOff: t("board.cameraOff"),
    share: t("board.screenShare"),
    hostMute: t("voiceRoom.hostMute"),
    mutedRemote: t("voiceRoom.mutedRemote"),
    muteFailed: t("voiceRoom.muteFailed"),
    configure: t("voiceRoom.configure"),
    missingPublicUrl: t("voiceRoom.missingPublicUrl"),
    liveMini: t("voiceRoom.liveMini"),
  };

  async function join() {
    setJoinError(null);
    setJoining(true);
    const res = await requestLiveKitTokenAction(
      boardId,
      coworkRoomId ?? undefined,
    );
    setJoining(false);
    if (!res.ok) {
      setJoinError(res.message);
      return;
    }
    setToken(res.token);
    setExpanded(true);
  }

  const connected = Boolean(token && serverUrl);

  return (
    <div
      className="fixed z-[96]"
      style={{
        right: "max(1rem, env(safe-area-inset-right))",
        bottom: "max(1rem, env(safe-area-inset-bottom))",
      }}
    >
      {!connected ? (
        <button
          type="button"
          onClick={() => void join()}
          disabled={joining || !serverUrl}
          title={
            !serverUrl
              ? labels.configure
              : coworkRoomId != null
                ? t("voiceRoom.joinThisRoom")
                : labels.join
          }
          className="group flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_32px_rgba(0,0,0,0.35)] backdrop-blur-xl transition-all hover:bg-white/15 hover:shadow-[0_12px_40px_rgba(56,189,248,0.15)] disabled:cursor-not-allowed disabled:opacity-50 dark:border-white/10 dark:bg-slate-900/40"
        >
          {joining ? (
            <Loader2 className="h-5 w-5 animate-spin text-sky-300" aria-hidden />
          ) : (
            <Radio className="h-5 w-5 text-sky-400" aria-hidden />
          )}
          <span className="max-w-[10rem] truncate sm:max-w-[14rem]">
            {joining
              ? labels.joining
              : coworkRoomId != null
                ? t("voiceRoom.joinThisRoom")
                : labels.join}
          </span>
        </button>
      ) : null}

      {!connected && !serverUrl ? (
        <p className="mt-2 max-w-[min(100vw-2rem,280px)] rounded-lg border border-amber-500/30 bg-amber-950/50 px-2.5 py-2 text-[11px] leading-snug text-amber-100/95 backdrop-blur-md">
          {labels.missingPublicUrl}
        </p>
      ) : null}

      {joinError ? (
        <p className="mt-2 max-w-xs rounded-lg border border-red-500/40 bg-red-950/80 px-2 py-1.5 text-xs text-red-100 backdrop-blur-md">
          {joinError}
        </p>
      ) : null}

      {connected ? (
        <div
          className={`flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/20 bg-slate-950/45 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-2xl transition-all dark:border-white/10 dark:bg-slate-950/55 ${
            expanded
              ? "h-[min(72vh,520px)] w-[min(100vw-2rem,380px)]"
              : "h-14 w-[min(100vw-2rem,280px)]"
          }`}
        >
          <div className="flex shrink-0 items-center justify-between gap-2 border-b border-white/10 bg-white/5 px-3 py-2 backdrop-blur-md">
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-bold text-white">
                {coworkRoomTitle ?? boardName}
              </p>
              <p className="truncate text-[10px] text-white/50">
                {coworkRoomTitle
                  ? `${boardName} · ${isHost ? t("voiceRoom.roleHost") : t("voiceRoom.roleDev")}`
                  : isHost
                    ? t("voiceRoom.roleHost")
                    : t("voiceRoom.roleDev")}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setExpanded((e) => !e)}
              className="rounded-lg p-1.5 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
              aria-expanded={expanded}
              title={expanded ? labels.minimize : labels.expand}
            >
              {expanded ? (
                <ChevronDown className="h-4 w-4" aria-hidden />
              ) : (
                <ChevronUp className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>

          <LiveKitRoom
            key={`${boardId}-${coworkRoomId ?? "main"}-${token!.slice(0, 20)}`}
            serverUrl={serverUrl}
            token={token!}
            connect
            audio
            video
            onDisconnected={() => {
              setToken(null);
              setJoinError(null);
            }}
            onError={(e) => setJoinError(e.message)}
            className={`relative flex min-h-0 flex-col ${
              expanded ? "min-h-0 flex-1" : "h-11 shrink-0"
            }`}
          >
            <VoiceRoomSession
              boardId={boardId}
              coworkRoomId={coworkRoomId}
              isHost={isHost}
              labels={labels}
              expanded={expanded}
            />
          </LiveKitRoom>
        </div>
      ) : null}
    </div>
  );
}
