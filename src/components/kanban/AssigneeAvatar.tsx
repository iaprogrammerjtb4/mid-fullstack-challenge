function initialsFromName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0]!}${parts[1]![0]!}`.toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

export function AssigneeAvatar({ name }: { name: string }) {
  const initials = initialsFromName(name);
  const unassigned = !name.trim();

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold transition-all duration-200 ${
        unassigned
          ? "border-slate-200 bg-slate-100 text-slate-400"
          : "border-blue-100 bg-gradient-to-br from-blue-50 to-indigo-50 text-blue-800"
      }`}
      title={unassigned ? "Unassigned" : name}
    >
      {initials}
    </div>
  );
}
