"use client";

import Link from "next/link";
import {
  Activity,
  BarChart3,
  Layers,
  LayoutGrid,
  MessageSquare,
  PieChart as PieChartIcon,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useLocale } from "@/i18n/locale-provider";
import { apiJson } from "@/lib/client-api";
import type { AdminAnalytics } from "@/lib/admin-analytics";
import { useTheme } from "@/theme/theme-provider";

const PRIORITY_FILL: Record<string, string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#22c55e",
};

const TYPE_FILL: Record<string, string> = {
  task: "#6366f1",
  story: "#8b5cf6",
  bug: "#f43f5e",
};

function truncate(s: string, n: number) {
  if (s.length <= n) return s;
  return `${s.slice(0, n - 1)}…`;
}

export function AdminDashboard() {
  const { t } = useLocale();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const tick = isDark ? "#94a3b8" : "#64748b";
  const grid = isDark ? "#334155" : "#e2e8f0";
  const tooltipBg = isDark ? "#0f172a" : "#ffffff";
  const tooltipBorder = isDark ? "#334155" : "#e2e8f0";

  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetch("/api/admin/analytics", { cache: "no-store" });
    const body = await apiJson<AdminAnalytics>(res);
    setLoading(false);
    if (!body.ok) {
      setData(null);
      setError(body.error.message);
      return;
    }
    setData(body.data);
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional mount fetch for admin metrics
    void load();
  }, [load]);

  const flowChartData = useMemo(() => {
    if (!data) return [];
    return data.flowByBoard.map((r) => ({
      ...r,
      label: truncate(r.boardName, 22),
    }));
  }, [data]);

  const activityData = useMemo(() => {
    if (!data) return [];
    return data.taskCreationTrend.map((pt, i) => ({
      date: pt.date.slice(5),
      tasks: pt.count,
      comments: data.commentTrend[i]?.count ?? 0,
    }));
  }, [data]);

  const piePriority = useMemo(() => {
    if (!data) return [];
    return data.priorityBreakdown.filter((p) => p.count > 0);
  }, [data]);

  const pieTypes = useMemo(() => {
    if (!data) return [];
    return data.typeBreakdown.filter((p) => p.count > 0);
  }, [data]);

  const generatedLabel = useMemo(() => {
    if (!data) return "";
    try {
      const time = new Date(data.generatedAt).toLocaleString();
      return t("admin.generatedAt", { time });
    } catch {
      return "";
    }
  }, [data, t]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/50 dark:border-slate-600 dark:bg-slate-900/40">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {t("admin.loading")}
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 dark:border-red-900/50 dark:bg-red-950/30">
        <p className="text-sm text-red-800 dark:text-red-200">{t("admin.error")}</p>
        <p className="mt-1 text-xs text-red-700/80 dark:text-red-300/90">
          {error}
        </p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-4 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white dark:bg-sky-600"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {t("admin.refresh")}
        </button>
      </div>
    );
  }

  if (!data) return null;

  const empty = data.totals.boards === 0;

  if (empty) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-gradient-to-br from-white to-slate-50 px-8 py-14 text-center dark:border-slate-600 dark:from-slate-900 dark:to-slate-950">
        <BarChart3 className="mx-auto h-12 w-12 text-slate-400 dark:text-slate-500" />
        <h2 className="mt-4 text-lg font-bold text-slate-900 dark:text-slate-100">
          {t("admin.emptyTitle")}
        </h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600 dark:text-slate-400">
          {t("admin.emptyHint")}
        </p>
      </div>
    );
  }

  const tooltipStyle = {
    backgroundColor: tooltipBg,
    border: `1px solid ${tooltipBorder}`,
    borderRadius: 10,
    fontSize: 12,
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-3xl">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t("admin.reportTitle")}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {t("admin.reportIntro")}
          </p>
          <p className="mt-2 text-xs font-medium text-slate-400 dark:text-slate-500">
            {generatedLabel}
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 shadow-sm transition-all hover:border-slate-300 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:border-slate-500 dark:hover:bg-slate-700"
        >
          <RefreshCw
            className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
            aria-hidden
          />
          {t("admin.refresh")}
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard
          icon={<LayoutGrid className="h-5 w-5" />}
          label={t("admin.kpiBoards")}
          value={data.totals.boards}
          accent="border-l-amber-500"
        />
        <KpiCard
          icon={<Layers className="h-5 w-5" />}
          label={t("admin.kpiColumns")}
          value={data.totals.columns}
          accent="border-l-sky-500"
        />
        <KpiCard
          icon={<BarChart3 className="h-5 w-5" />}
          label={t("admin.kpiTasks")}
          value={data.totals.tasks}
          accent="border-l-emerald-500"
        />
        <KpiCard
          icon={<MessageSquare className="h-5 w-5" />}
          label={t("admin.kpiComments")}
          value={data.totals.comments}
          accent="border-l-violet-500"
        />
        <KpiCard
          icon={<Users className="h-5 w-5" />}
          label={t("admin.kpiUsers")}
          value={data.totals.users}
          accent="border-l-rose-500"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("admin.chartTasksPerBoard")}
          hint={t("admin.chartTasksPerBoardHint")}
          icon={<BarChart3 className="h-4 w-4" />}
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <BarChart
              data={data.tasksByBoard}
              margin={{ top: 8, right: 8, left: -8, bottom: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} vertical={false} />
              <XAxis
                dataKey="boardName"
                tick={{ fill: tick, fontSize: 11 }}
                tickFormatter={(v) => truncate(String(v), 12)}
                interval={0}
                angle={-18}
                textAnchor="end"
                height={56}
                stroke={tick}
              />
              <YAxis
                tick={{ fill: tick, fontSize: 11 }}
                allowDecimals={false}
                stroke={tick}
              />
              <Tooltip
                contentStyle={tooltipStyle}
                labelStyle={{ color: tick }}
                formatter={(value) => [value ?? 0, t("admin.kpiTasks")]}
              />
              <Bar
                dataKey="tasks"
                fill={isDark ? "#38bdf8" : "#0284c7"}
                radius={[6, 6, 0, 0]}
                name={t("admin.kpiTasks")}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title={t("admin.chartFlow")}
          hint={t("admin.chartFlowHint")}
          icon={<Activity className="h-4 w-4" />}
        >
          <ResponsiveContainer width="100%" height="100%" minHeight={280}>
            <BarChart
              layout="vertical"
              data={flowChartData}
              margin={{ top: 8, right: 16, left: 8, bottom: 8 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={grid} horizontal={false} />
              <XAxis type="number" tick={{ fill: tick, fontSize: 11 }} stroke={tick} />
              <YAxis
                type="category"
                dataKey="label"
                width={108}
                tick={{ fill: tick, fontSize: 10 }}
                stroke={tick}
              />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar
                dataKey="start"
                stackId="flow"
                fill="#64748b"
                name={t("admin.flowStart")}
              />
              <Bar
                dataKey="middle"
                stackId="flow"
                fill={isDark ? "#0ea5e9" : "#0284c7"}
                name={t("admin.flowMiddle")}
              />
              <Bar
                dataKey="end"
                stackId="flow"
                fill="#10b981"
                name={t("admin.flowEnd")}
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title={t("admin.chartPriority")}
          hint={t("admin.chartPriorityHint")}
          icon={<PieChartIcon className="h-4 w-4" />}
        >
          {piePriority.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={260}>
              <PieChart>
                <Pie
                  data={piePriority}
                  dataKey="count"
                  nameKey="key"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ key, percent }) => {
                    const k = String(key);
                    const lab = t(`taskCard.${k}`);
                    const name = lab.startsWith("taskCard.") ? k : lab;
                    return `${name} ${((percent as number) * 100).toFixed(0)}%`;
                  }}
                >
                  {piePriority.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={PRIORITY_FILL[entry.key] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard
          title={t("admin.chartTypes")}
          hint={t("admin.chartTypesHint")}
          icon={<PieChartIcon className="h-4 w-4" />}
        >
          {pieTypes.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height="100%" minHeight={260}>
              <PieChart>
                <Pie
                  data={pieTypes}
                  dataKey="count"
                  nameKey="key"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={88}
                  paddingAngle={2}
                  label={({ key, percent }) => {
                    const k = String(key);
                    const lab = t(`board.taskType.${k}`);
                    const name = lab.startsWith("board.") ? k : lab;
                    return `${name} ${((percent as number) * 100).toFixed(0)}%`;
                  }}
                >
                  {pieTypes.map((entry) => (
                    <Cell
                      key={entry.key}
                      fill={TYPE_FILL[entry.key] ?? "#94a3b8"}
                    />
                  ))}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      <ChartCard
        title={t("admin.chartActivity")}
        hint={t("admin.chartActivityHint")}
        icon={<Activity className="h-4 w-4" />}
        className="lg:col-span-2"
      >
        <ResponsiveContainer width="100%" height="100%" minHeight={300}>
          <ComposedChart
            data={activityData}
            margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="adminTaskFill" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor={isDark ? "#38bdf8" : "#0284c7"}
                  stopOpacity={0.35}
                />
                <stop
                  offset="100%"
                  stopColor={isDark ? "#38bdf8" : "#0284c7"}
                  stopOpacity={0}
                />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={grid} />
            <XAxis dataKey="date" tick={{ fill: tick, fontSize: 11 }} stroke={tick} />
            <YAxis tick={{ fill: tick, fontSize: 11 }} allowDecimals={false} stroke={tick} />
            <Tooltip contentStyle={tooltipStyle} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Area
              type="monotone"
              dataKey="tasks"
              stroke="none"
              fill="url(#adminTaskFill)"
              legendType="none"
            />
            <Line
              type="monotone"
              dataKey="tasks"
              stroke={isDark ? "#38bdf8" : "#0284c7"}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={t("admin.seriesTasksCreated")}
            />
            <Line
              type="monotone"
              dataKey="comments"
              stroke="#a855f7"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
              name={t("admin.seriesComments")}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("admin.tableBoards")}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <th className="px-4 py-3">{t("admin.colBoard")}</th>
                  <th className="px-4 py-3">{t("admin.colTasks")}</th>
                  <th className="px-4 py-3">{t("admin.colColumns")}</th>
                  <th className="px-4 py-3">{t("admin.colCreated")}</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {data.boards.map((b) => (
                  <tr
                    key={b.id}
                    className="border-b border-slate-50 transition-colors hover:bg-slate-50/80 dark:border-slate-800/80 dark:hover:bg-slate-800/40"
                  >
                    <td className="max-w-[10rem] truncate px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {b.taskCount}
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {b.columnCount}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {b.createdAt}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/boards/${b.id}`}
                        className="text-xs font-semibold text-sky-600 hover:text-sky-500 dark:text-sky-400"
                      >
                        {t("admin.openBoard")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none">
          <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t("admin.tableAssignees")}
            </h3>
          </div>
          {data.assigneeLoad.length === 0 ? (
            <p className="px-5 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
              —
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                    <th className="px-4 py-3">{t("admin.colAssignee")}</th>
                    <th className="px-4 py-3">{t("admin.colAssigneeTasks")}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.assigneeLoad.map((row) => (
                    <tr
                      key={row.assignee}
                      className="border-b border-slate-50 dark:border-slate-800/80"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                        {row.assignee}
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {row.tasks}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  accent,
}: {
  icon: ReactNode;
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/80 ${accent} border-l-4`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
          {label}
        </span>
        <span className="text-slate-400 dark:text-slate-500">{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
        {value}
      </p>
    </div>
  );
}

function ChartCard({
  title,
  hint,
  icon,
  children,
  className,
}: {
  title: string;
  hint: string;
  icon: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`flex flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_4px_24px_rgba(15,23,42,0.06)] dark:border-slate-700 dark:bg-slate-900/80 dark:shadow-none ${className ?? ""}`}
    >
      <div className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          {icon}
        </span>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            {hint}
          </p>
        </div>
      </div>
      <div className="min-h-[260px] flex-1">{children}</div>
    </section>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-sm text-slate-400 dark:text-slate-500">
      —
    </div>
  );
}
