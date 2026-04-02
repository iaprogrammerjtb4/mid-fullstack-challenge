import { BugPlay, CheckSquare, FileText } from "lucide-react";
import type { TaskType } from "@/lib/types";

const iconClass = "h-4 w-4 shrink-0 text-slate-600";

export function TaskTypeIcon({ type }: { type: TaskType }) {
  switch (type) {
    case "bug":
      return (
        <span className={iconClass} title="Bug" aria-hidden>
          <BugPlay className="h-4 w-4" strokeWidth={2} />
        </span>
      );
    case "story":
      return (
        <span className={iconClass} title="Story" aria-hidden>
          <FileText className="h-4 w-4" strokeWidth={2} />
        </span>
      );
    default:
      return (
        <span className={iconClass} title="Task" aria-hidden>
          <CheckSquare className="h-4 w-4" strokeWidth={2} />
        </span>
      );
  }
}
