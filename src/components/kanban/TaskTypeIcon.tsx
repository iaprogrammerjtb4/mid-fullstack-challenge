import type { TaskType } from "@/lib/types";

const iconClass = "h-4 w-4 shrink-0 text-slate-500";

export function TaskTypeIcon({ type }: { type: TaskType }) {
  switch (type) {
    case "bug":
      return (
        <span className={iconClass} title="Bug" aria-hidden>
          <svg viewBox="0 0 16 16" fill="currentColor" className="h-full w-full">
            <path d="M8 1a1 1 0 011 1v1.09A4.002 4.002 0 0112 7v1h1a1 1 0 110 2h-1v1a4 4 0 01-3 3.87V15a1 1 0 11-2 0v-.13A4 4 0 014 11v-1H3a1 1 0 110-2h1V7a4 4 0 013-3.91V2a1 1 0 011-1zm0 4a2 2 0 00-2 2v2a2 2 0 002 2 2 2 0 002-2V7a2 2 0 00-2-2z" />
          </svg>
        </span>
      );
    case "story":
      return (
        <span className={iconClass} title="Story" aria-hidden>
          <svg viewBox="0 0 16 16" fill="none" className="h-full w-full">
            <path
              d="M3 2h7l3 3v9a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"
              stroke="currentColor"
              strokeWidth="1.25"
              fill="none"
            />
            <path d="M6 6h4M6 9h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
          </svg>
        </span>
      );
    default:
      return (
        <span className={iconClass} title="Task" aria-hidden>
          <svg viewBox="0 0 16 16" fill="none" className="h-full w-full">
            <rect
              x="2.5"
              y="3"
              width="11"
              height="11"
              rx="1.5"
              stroke="currentColor"
              strokeWidth="1.25"
            />
            <path d="M5 7.5l2 2 3.5-3.5" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      );
  }
}
