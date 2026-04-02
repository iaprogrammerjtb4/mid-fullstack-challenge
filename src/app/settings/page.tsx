"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useDashboardMeta } from "@/components/shell/dashboard-meta-provider";
import { useLocale } from "@/i18n/locale-provider";
import { TeamCallDirectory } from "@/components/settings/TeamCallDirectory";
import { apiJson } from "@/lib/client-api";

export default function SettingsPage() {
  const { setMeta } = useDashboardMeta();
  const { t } = useLocale();
  const { data: session, update } = useSession();

  const [photoMsg, setPhotoMsg] = useState<"ok" | null>(null);
  const [photoErr, setPhotoErr] = useState<string | null>(null);
  const [photoPending, setPhotoPending] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const [emailEdit, setEmailEdit] = useState<string | null>(null);
  const emailValue =
    emailEdit !== null ? emailEdit : (session?.user?.email ?? "");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [accountErr, setAccountErr] = useState<string | null>(null);
  const [accountOk, setAccountOk] = useState(false);
  const [accountPending, setAccountPending] = useState(false);

  useEffect(() => {
    setMeta({
      title: t("settings.title"),
      subtitle: t("settings.subtitle"),
    });
    return () => setMeta({ title: t("meta.dashboard"), subtitle: undefined });
  }, [setMeta, t]);

  const previewBlobUrl = useMemo(() => {
    if (!file) return null;
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewBlobUrl) URL.revokeObjectURL(previewBlobUrl);
    };
  }, [previewBlobUrl]);

  async function uploadPhoto(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setPhotoPending(true);
    setPhotoErr(null);
    setPhotoMsg(null);
    const fd = new FormData();
    fd.set("file", file);
    const res = await fetch("/api/me/avatar", {
      method: "POST",
      body: fd,
    });
    const body = await apiJson<{ image: string }>(res);
    setPhotoPending(false);
    if (!body.ok) {
      setPhotoErr(body.error.message);
      return;
    }
    setPhotoMsg("ok");
    setFile(null);
    await update({ user: { image: body.data.image } });
  }

  async function saveAccount(e: React.FormEvent) {
    e.preventDefault();
    setAccountErr(null);
    setAccountOk(false);

    const sessionEmail = (session?.user?.email ?? "").toLowerCase();
    const nextEmail = emailValue.trim().toLowerCase();
    const emailChanged = nextEmail.length > 0 && nextEmail !== sessionEmail;
    const pwChange = newPassword.length > 0;

    if (!emailChanged && !pwChange) {
      setAccountErr(t("settings.nothingToUpdate"));
      return;
    }
    if (pwChange && newPassword.length < 8) {
      setAccountErr(t("settings.passwordMin8"));
      return;
    }
    if (pwChange && newPassword !== confirmPassword) {
      setAccountErr(t("settings.passwordMismatch"));
      return;
    }
    if (!currentPassword) {
      setAccountErr(t("settings.currentPasswordHint"));
      return;
    }

    setAccountPending(true);
    const payload: Record<string, string> = {
      currentPassword,
    };
    if (emailChanged) payload.email = emailValue.trim();
    if (pwChange) {
      payload.newPassword = newPassword;
      payload.confirmPassword = confirmPassword;
    }

    const res = await fetch("/api/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await apiJson<{ email: string }>(res);
    setAccountPending(false);

    if (!body.ok) {
      setAccountErr(body.error.message);
      return;
    }

    setAccountOk(true);
    setNewPassword("");
    setConfirmPassword("");
    setCurrentPassword("");
    setEmailEdit(null);
    await update({
      user: { email: body.data.email },
    });
  }

  const displayImage = previewBlobUrl ?? session?.user?.image ?? null;

  return (
    <div className="px-4 py-8 sm:px-6 sm:py-10">
      <div className="mx-auto max-w-lg">
        <Link
          href="/"
          className="text-sm font-medium text-blue-700 transition-colors duration-200 hover:text-blue-900 dark:text-sky-400 dark:hover:text-sky-300"
        >
          {t("settings.back")}
        </Link>

        <TeamCallDirectory />

        <section className="mt-8 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("settings.photoTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("settings.photoHint")}
          </p>
          <form onSubmit={uploadPhoto} className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-200 bg-slate-100 dark:border-slate-600 dark:bg-slate-800">
                {displayImage ? (
                  // eslint-disable-next-line @next/next/no-img-element -- user-uploaded dynamic URL
                  <img
                    src={displayImage}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-xs font-semibold text-slate-400">
                    —
                  </div>
                )}
              </div>
              <label className="flex cursor-pointer flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
                <span className="sr-only">{t("settings.chooseFile")}</span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="max-w-full text-xs file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-white dark:file:bg-sky-600"
                  onChange={(e) => {
                    setPhotoMsg(null);
                    setPhotoErr(null);
                    const f = e.target.files?.[0];
                    setFile(f ?? null);
                  }}
                />
              </label>
            </div>
            {photoErr ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {photoErr}
              </p>
            ) : null}
            {photoMsg ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {t("settings.uploadOk")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={!file || photoPending}
              className="self-start rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {photoPending ? t("settings.uploading") : t("settings.upload")}
            </button>
          </form>
        </section>

        <section className="mt-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/80">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t("settings.emailTitle")} · {t("settings.passwordTitle")}
          </h2>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {t("settings.currentPasswordHint")}
          </p>
          <form onSubmit={saveAccount} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("settings.emailLabel")}
              <input
                type="email"
                autoComplete="email"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={emailValue}
                onChange={(e) => setEmailEdit(e.target.value)}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("settings.newPassword")}
              <input
                type="password"
                autoComplete="new-password"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="········"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("settings.confirmPassword")}
              <input
                type="password"
                autoComplete="new-password"
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="········"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium text-slate-700 dark:text-slate-200">
              {t("settings.currentPassword")}
              <input
                type="password"
                autoComplete="current-password"
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
              />
            </label>
            {accountErr ? (
              <p className="text-sm text-red-600 dark:text-red-400">
                {accountErr}
              </p>
            ) : null}
            {accountOk ? (
              <p className="text-sm text-emerald-700 dark:text-emerald-400">
                {t("settings.accountOk")}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={accountPending}
              className="mt-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 dark:bg-sky-600 dark:hover:bg-sky-500"
            >
              {accountPending
                ? t("settings.accountSaving")
                : t("settings.saveAccount")}
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
