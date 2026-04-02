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
      <div className="min-h-screen bg-[#F4F5F7] px-6 py-10">
        <div className="mx-auto flex max-w-lg flex-col gap-4">
          <h1 className="text-xl font-bold text-slate-900">Boards</h1>
          <p className="text-sm text-slate-500">Loading…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F5F7] px-6 py-10">
      <div className="mx-auto flex max-w-lg flex-col gap-6">
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Task boards
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Open a board to manage work in columns.
          </p>
        </header>
        {error ? (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
            {error}
          </p>
        ) : null}
        <form
          onSubmit={createBoard}
          className="flex flex-col gap-3 rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200"
        >
          <label className="text-sm font-semibold text-slate-800">
            New board
          </label>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-all duration-200 focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Board name"
            />
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-800 disabled:opacity-50"
            >
              {creating ? "…" : "Create"}
            </button>
          </div>
        </form>
        {boards.length === 0 ? (
          <p className="text-sm text-slate-600">
            No boards yet. Create one above, or run{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-slate-800 shadow-sm ring-1 ring-slate-200/80">
              bun run seed
            </code>{" "}
            or{" "}
            <code className="rounded bg-white px-1.5 py-0.5 text-slate-800 shadow-sm ring-1 ring-slate-200/80">
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
                  className="block rounded-lg border border-slate-200/90 bg-white px-4 py-3 font-semibold text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] transition-all duration-200 hover:-translate-y-px hover:border-slate-300 hover:shadow-[0_4px_12px_rgba(15,23,42,0.08)]"
                >
                  {b.name}
                  <span className="mt-1 block text-xs font-medium text-slate-500">
                    {b.createdAt}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
