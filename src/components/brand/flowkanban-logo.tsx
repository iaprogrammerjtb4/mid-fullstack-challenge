import Image from "next/image";

type Props = {
  /** Wide wordmark for sidebar header */
  variant?: "full" | "mark";
  /** Taller wordmark on login / marketing blocks */
  size?: "sm" | "md";
  className?: string;
  priority?: boolean;
};

/**
 * Official FlowKanban brand asset (public/brand/flowkanban-logo.png).
 */
export function FlowKanbanLogo({
  variant = "full",
  size = "sm",
  className = "",
  priority = false,
}: Props) {
  if (variant === "mark") {
    return (
      <span
        className={`relative block shrink-0 overflow-hidden rounded-lg bg-[#F8F9FA] ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:ring-slate-600/80 ${className}`}
        style={{ width: 36, height: 36 }}
      >
        <Image
          src="/brand/flowkanban-logo.png"
          alt=""
          width={120}
          height={48}
          className="h-full w-[135%] max-w-none object-cover object-left"
          priority={priority}
        />
      </span>
    );
  }

  const heightClass = size === "md" ? "h-10" : "h-8";
  const widthCap =
    size === "md" ? "max-w-[17rem]" : "max-w-[min(100%,11rem)]";

  return (
    <Image
      src="/brand/flowkanban-logo.png"
      alt="FlowKanban"
      width={220}
      height={56}
      className={`${heightClass} w-auto ${widthCap} object-contain object-left dark:brightness-[1.08] ${className}`}
      priority={priority}
    />
  );
}
