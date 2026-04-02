"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BoardSummary } from "@/lib/types";
import { apiJson } from "@/lib/client-api";

export default function Home() {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);

  async function load() {
    setError(null);
    const res = await fetch("/api/boards");
    const body = await apiJson<BoardSummary[]>(res);
    if (!body.ok) {
      setError(body.error.message);
      setBoards([]);
      return;
    }
    setBoards(body.data);
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch for board list
    void load();
  }, []);

  async function createBoard(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    setError(null);
    const res = await fetch("/api/boards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    });
    const body = await apiJson<BoardSummary>(res);
    setCreating(false);
    if (!body.ok) {
      setError(body.error.message);
      return;
    }
    setName("");
    await load();
  }

  if (boards === null) {
    return (
      <div className="mx-auto flex max-w-lg flex-col gap-4 p-8">
        <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Boards
        </h1>
        <p className="text-zinc-500">Loading…</p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 p-8">
      <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">
        Task boards
      </h1>
      {error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </p>
      ) : null}
      <form
        onSubmit={createBoard}
        className="flex flex-col gap-2 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950"
      >
        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          New board
        </label>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Board name"
          />
          <button
            type="submit"
            disabled={creating}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
          >
            {creating ? "…" : "Create"}
          </button>
        </div>
      </form>
      {boards.length === 0 ? (
        <p className="text-zinc-500 dark:text-zinc-400">
          No boards yet. Create one above, or run{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            bun run seed
          </code>{" "}
          or{" "}
          <code className="rounded bg-zinc-100 px-1 py-0.5 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200">
            npm run seed
          </code>{" "}
          for sample data.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {boards.map((b) => (
            <li key={b.id}>
              <Link
                href={`/boards/${b.id}`}
                className="block rounded-xl border border-zinc-200 bg-white px-4 py-3 font-medium text-zinc-900 transition hover:border-zinc-400 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:border-zinc-600"
              >
                {b.name}
                <span className="mt-1 block text-xs font-normal text-zinc-500">
                  {b.createdAt}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
