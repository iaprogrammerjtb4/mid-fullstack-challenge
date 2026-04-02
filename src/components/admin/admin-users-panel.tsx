"use client";

import { Pencil, Phone, Plus, UserPlus, Video } from "lucide-react";
import { useSession } from "next-auth/react";
import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
} from "react";
import { useLocale } from "@/i18n/locale-provider";
import { WorkspaceCallDock } from "@/components/admin/WorkspaceCallDock";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { apiJson } from "@/lib/client-api";
import { UserRole, type UserRoleType } from "@/lib/roles";

type AdminUserRow = {
  id: number;
  email: string;
  role: UserRoleType;
  image: string | null;
  createdAt: string;
  isOnline: boolean;
};

export function AdminUsersPanel() {
  const { t } = useLocale();
  const { data: session } = useSession();
  const myId = session?.user?.id ? Number(session.user.id) : NaN;

  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [activeCall, setActiveCall] = useState<{
    peerId: number;
    email: string;
    mode: "audio" | "video";
  } | null>(null);

  const load = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoading(true);
      setError(null);
    }
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    const body = await apiJson<AdminUserRow[]>(res);
    if (!opts?.silent) {
      setLoading(false);
    }
    if (!body.ok) {
      if (!opts?.silent) {
        setUsers([]);
        setError(body.error.message);
      }
      return;
    }
    setUsers(body.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch
    void load();
  }, [load]);

  useEffect(() => {
    const id = window.setInterval(() => void load({ silent: true }), 28_000);
    return () => window.clearInterval(id);
  }, [load]);

  return (
    <section className="mt-16 border-t border-slate-200 pt-12 dark:border-slate-800">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("admin.usersSectionTitle")}
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-400">
            {t("admin.usersSectionHint")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setBanner(null);
            setCreateOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-slate-800 dark:bg-sky-600 dark:hover:bg-sky-500"
        >
          <UserPlus className="h-4 w-4" aria-hidden />
          {t("admin.usersNew")}
        </button>
      </div>

      {banner ? (
        <div
          className={`mb-6 rounded-xl border px-4 py-3 text-sm ${
            banner.kind === "ok"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-200"
          }`}
        >
          {banner.text}
        </div>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {t("admin.loading")}
        </p>
      ) : error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/90 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-4 py-3">{t("admin.usersColPhoto")}</th>
                  <th className="px-4 py-3">{t("admin.usersColEmail")}</th>
                  <th className="px-4 py-3">{t("admin.usersColRole")}</th>
                  <th className="px-4 py-3">{t("admin.usersColPresence")}</th>
                  <th className="px-4 py-3">{t("admin.usersColCreated")}</th>
                  <th className="px-4 py-3 text-right">
                    {t("admin.usersColActions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-50 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element -- stored profile URL
                          <img
                            src={u.image}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px] font-bold text-slate-400">
                            —
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {u.email}
                      </div>
                      {u.id === myId ? (
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-sky-600 dark:text-sky-400">
                          {t("admin.usersYou")}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <RoleBadge role={u.role} t={t} />
                    </td>
                    <td className="px-4 py-3">
                      <PresenceBadge online={u.isOnline} />
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {u.createdAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {u.id !== myId ? (
                          <>
                            <button
                              type="button"
                              title={t("admin.usersCallVoiceTitle")}
                              onClick={() => {
                                setBanner(null);
                                setActiveCall({
                                  peerId: u.id,
                                  email: u.email,
                                  mode: "audio",
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-sky-300 hover:bg-sky-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-sky-500 dark:hover:bg-slate-700"
                            >
                              <Phone className="h-3.5 w-3.5 text-sky-600 dark:text-sky-400" aria-hidden />
                              {t("admin.usersCallVoice")}
                            </button>
                            <button
                              type="button"
                              title={t("admin.usersCallVideoTitle")}
                              onClick={() => {
                                setBanner(null);
                                setActiveCall({
                                  peerId: u.id,
                                  email: u.email,
                                  mode: "video",
                                });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:border-violet-300 hover:bg-violet-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-violet-500 dark:hover:bg-slate-700"
                            >
                              <Video className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" aria-hidden />
                              {t("admin.usersCallVideo")}
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => {
                            setBanner(null);
                            setEditUser(u);
                          }}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden />
                          {t("admin.usersEdit")}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {createOpen ? (
        <UserFormModal
          mode="create"
          title={t("admin.usersCreateTitle")}
          t={t}
          onClose={() => setCreateOpen(false)}
          onSuccess={(msg) => {
            setBanner({ kind: "ok", text: msg });
            setCreateOpen(false);
            void load();
          }}
          onError={(msg) => setBanner({ kind: "err", text: msg })}
        />
      ) : null}

      {activeCall ? (
        <WorkspaceCallDock
          key={`${activeCall.peerId}-${activeCall.mode}`}
          peerUserId={activeCall.peerId}
          peerEmail={activeCall.email}
          startWithVideo={activeCall.mode === "video"}
          onClose={() => setActiveCall(null)}
        />
      ) : null}

      {editUser ? (
        <UserFormModal
          mode="edit"
          title={t("admin.usersEditTitle")}
          initial={editUser}
          t={t}
          myId={myId}
          onClose={() => setEditUser(null)}
          onSuccess={(msg) => {
            setBanner({ kind: "ok", text: msg });
            setEditUser(null);
            void load();
          }}
          onError={(msg) => setBanner({ kind: "err", text: msg })}
        />
      ) : null}
    </section>
  );
}

function RoleBadge({
  role,
  t,
}: {
  role: UserRoleType;
  t: (path: string) => string;
}) {
  const isPm = role === UserRole.PM;
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
        isPm
          ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200"
          : "bg-emerald-100 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
      }`}
    >
      {isPm ? t("admin.usersRolePm") : t("admin.usersRoleDev")}
    </span>
  );
}

type Translate = (path: string) => string;

function UserFormModal({
  mode,
  title,
  initial,
  myId,
  t,
  onClose,
  onSuccess,
  onError,
}: {
  mode: "create" | "edit";
  title: string;
  initial?: AdminUserRow;
  myId?: number;
  t: Translate;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<UserRoleType>(
    initial?.role ?? UserRole.DEVELOPER,
  );
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [clearImage, setClearImage] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);

    if (mode === "create") {
      if (password.length < 8) {
        onError(t("settings.passwordMin8"));
        setPending(false);
        return;
      }
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, role }),
      });
      const body = await apiJson<AdminUserRow>(res);
      setPending(false);
      if (!body.ok) {
        onError(body.error.message);
        return;
      }
      onSuccess(t("admin.usersCreateOk"));
      return;
    }

    if (!initial) {
      setPending(false);
      return;
    }

    try {
      if (file) {
        const fd = new FormData();
        fd.set("file", file);
        const up = await fetch(`/api/admin/users/${initial.id}/avatar`, {
          method: "POST",
          body: fd,
        });
        const upBody = await apiJson<{ image: string }>(up);
        if (!upBody.ok) {
          onError(upBody.error.message);
          setPending(false);
          return;
        }
      }

      const patch: Record<string, unknown> = {};
      if (email.trim().toLowerCase() !== initial.email.toLowerCase()) {
        patch.email = email.trim();
      }
      if (role !== initial.role) {
        patch.role = role;
      }
      if (newPassword.length > 0) {
        if (newPassword.length < 8) {
          onError(t("settings.passwordMin8"));
          setPending(false);
          return;
        }
        patch.newPassword = newPassword;
      }
      if (clearImage && !file) {
        patch.clearImage = true;
      }

      if (Object.keys(patch).length > 0) {
        const res = await fetch(`/api/admin/users/${initial.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const body = await apiJson<AdminUserRow>(res);
        if (!body.ok) {
          onError(body.error.message);
          setPending(false);
          return;
        }
      } else if (!file) {
        setPending(false);
        onClose();
        return;
      }

      setPending(false);
      let msg = t("admin.usersSaveOk");
      if (
        initial.id === myId &&
        (patch.email !== undefined || patch.newPassword !== undefined)
      ) {
        msg = `${t("admin.usersSaveOk")} ${t("admin.usersReLoginHint")}`;
      }
      onSuccess(msg);
    } catch {
      setPending(false);
      onError(t("settings.errorGeneric"));
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[2px] dark:bg-black/60"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-user-modal-title"
    >
      <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-600 dark:bg-slate-900">
        <h2
          id="admin-user-modal-title"
          className="text-lg font-bold text-slate-900 dark:text-slate-100"
        >
          {title}
        </h2>

        <form onSubmit={onSubmit} className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("login.email")}
            <input
              type="email"
              required
              autoComplete="email"
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
            {t("admin.usersColRole")}
            <select
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              value={role}
              onChange={(e) =>
                setRole(e.target.value as UserRoleType)
              }
            >
              <option value={UserRole.PM}>{t("admin.usersRolePm")}</option>
              <option value={UserRole.DEVELOPER}>
                {t("admin.usersRoleDev")}
              </option>
            </select>
          </label>

          {mode === "create" ? (
            <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("admin.usersPassword")}
              <input
                type="password"
                required
                autoComplete="new-password"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </label>
          ) : (
            <>
              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                {t("admin.usersNewPassword")}
                <input
                  type="password"
                  autoComplete="new-password"
                  placeholder="········"
                  className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t("admin.usersNewPasswordHint")}
                </span>
              </label>

              <label className="flex flex-col gap-1.5 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span>{t("admin.usersUploadPhoto")}</span>
                <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                  {t("admin.usersPhotoHint")}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="text-xs file:mr-2 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-sky-600"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    setFile(f ?? null);
                    if (f) setClearImage(false);
                  }}
                />
              </label>

              <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-700 dark:text-slate-200">
                <input
                  type="checkbox"
                  checked={clearImage}
                  disabled={!!file}
                  onChange={(e) => setClearImage(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-600"
                />
                {t("admin.usersClearPhoto")}
              </label>
            </>
          )}

          <div className="mt-2 flex justify-end gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {t("admin.usersCancel")}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 dark:bg-sky-600"
            >
              {mode === "create" ? (
                <>
                  <Plus className="h-4 w-4" aria-hidden />
                  {pending ? t("admin.usersCreating") : t("admin.usersCreate")}
                </>
              ) : pending ? (
                t("admin.usersSaving")
              ) : (
                t("admin.usersSave")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
