import { getDb, asNumber } from "@/lib/db";

export type BoardSummaryRow = {
  id: number;
  name: string;
  createdAt: string;
  taskCount: number;
  columnCount: number;
};

export type ColumnTaskRow = {
  boardId: number;
  boardName: string;
  columnId: number;
  columnName: string;
  displayOrder: number;
  taskCount: number;
};

export type FlowBoardRow = {
  boardId: number;
  boardName: string;
  start: number;
  middle: number;
  end: number;
};

export type NamedCount = { key: string; count: number };

export type TrendPoint = { date: string; count: number };

export type AdminAnalytics = {
  generatedAt: string;
  totals: {
    boards: number;
    columns: number;
    tasks: number;
    comments: number;
    users: number;
  };
  boards: BoardSummaryRow[];
  tasksByBoard: { boardId: number; boardName: string; tasks: number }[];
  columnTasks: ColumnTaskRow[];
  flowByBoard: FlowBoardRow[];
  priorityBreakdown: NamedCount[];
  typeBreakdown: NamedCount[];
  assigneeLoad: { assignee: string; tasks: number }[];
  taskCreationTrend: TrendPoint[];
  commentTrend: TrendPoint[];
};

function countN(db: ReturnType<typeof getDb>, sql: string): number {
  const row = db.prepare(sql).get() as { n: number | bigint } | undefined;
  return row ? asNumber(row.n) : 0;
}

function lastDaysISO(n: number): string[] {
  const out: string[] = [];
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const x = new Date(d);
    x.setUTCDate(x.getUTCDate() - i);
    out.push(x.toISOString().slice(0, 10));
  }
  return out;
}

function fillTrend(
  days: string[],
  rows: { d: string; c: number | bigint }[],
): TrendPoint[] {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.d, asNumber(r.c));
  }
  return days.map((date) => ({ date, count: map.get(date) ?? 0 }));
}

function buildFlowByBoard(columnTasks: ColumnTaskRow[]): FlowBoardRow[] {
  const byBoard = new Map<number, ColumnTaskRow[]>();
  for (const row of columnTasks) {
    const list = byBoard.get(row.boardId) ?? [];
    list.push(row);
    byBoard.set(row.boardId, list);
  }

  const result: FlowBoardRow[] = [];
  for (const [boardId, cols] of byBoard) {
    const sorted = [...cols].sort((a, b) => a.displayOrder - b.displayOrder);
    if (sorted.length === 0) continue;
    const boardName = sorted[0].boardName;
    if (sorted.length === 1) {
      result.push({
        boardId,
        boardName,
        start: sorted[0].taskCount,
        middle: 0,
        end: 0,
      });
      continue;
    }
    const start = sorted[0].taskCount;
    const end = sorted[sorted.length - 1].taskCount;
    const middle = sorted
      .slice(1, -1)
      .reduce((s, c) => s + c.taskCount, 0);
    result.push({ boardId, boardName, start, middle, end });
  }
  result.sort((a, b) => b.start + b.middle + b.end - (a.start + a.middle + a.end));
  return result;
}

export function getAdminAnalytics(): AdminAnalytics {
  const db = getDb();
  const generatedAt = new Date().toISOString();

  const totals = {
    boards: countN(db, `SELECT COUNT(*) AS n FROM boards`),
    columns: countN(db, `SELECT COUNT(*) AS n FROM columns`),
    tasks: countN(db, `SELECT COUNT(*) AS n FROM tasks`),
    comments: countN(db, `SELECT COUNT(*) AS n FROM task_comments`),
    users: countN(db, `SELECT COUNT(*) AS n FROM users`),
  };

  const boardRows = db
    .prepare(
      `
    SELECT
      b.id AS id,
      b.name AS name,
      b.created_at AS createdAt,
      COUNT(DISTINCT c.id) AS columnCount,
      COUNT(t.id) AS taskCount
    FROM boards b
    LEFT JOIN columns c ON c.board_id = b.id
    LEFT JOIN tasks t ON t.column_id = c.id
    GROUP BY b.id
    ORDER BY b.created_at DESC
    `,
    )
    .all() as {
      id: number;
      name: string;
      createdAt: string;
      columnCount: number | bigint;
      taskCount: number | bigint;
    }[];

  const boards: BoardSummaryRow[] = boardRows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    columnCount: asNumber(r.columnCount),
    taskCount: asNumber(r.taskCount),
  }));

  const tasksByBoard = boards.map((b) => ({
    boardId: b.id,
    boardName: b.name,
    tasks: b.taskCount,
  }));

  const columnTaskRows = db
    .prepare(
      `
    SELECT
      b.id AS boardId,
      b.name AS boardName,
      c.id AS columnId,
      c.name AS columnName,
      c.display_order AS displayOrder,
      COUNT(t.id) AS taskCount
    FROM boards b
    JOIN columns c ON c.board_id = b.id
    LEFT JOIN tasks t ON t.column_id = c.id
    GROUP BY c.id
    ORDER BY b.id, c.display_order
    `,
    )
    .all() as {
      boardId: number;
      boardName: string;
      columnId: number;
      columnName: string;
      displayOrder: number;
      taskCount: number | bigint;
    }[];

  const columnTasks: ColumnTaskRow[] = columnTaskRows.map((r) => ({
    boardId: r.boardId,
    boardName: r.boardName,
    columnId: r.columnId,
    columnName: r.columnName,
    displayOrder: r.displayOrder,
    taskCount: asNumber(r.taskCount),
  }));

  const priorityRows = db
    .prepare(
      `SELECT priority AS key, COUNT(*) AS count FROM tasks GROUP BY priority`,
    )
    .all() as { key: string; count: number | bigint }[];

  const typeRows = db
    .prepare(
      `SELECT task_type AS key, COUNT(*) AS count FROM tasks GROUP BY task_type`,
    )
    .all() as { key: string; count: number | bigint }[];

  const assigneeRows = db
    .prepare(
      `
    SELECT MIN(TRIM(assignee_name)) AS assignee, COUNT(*) AS count
    FROM tasks
    WHERE TRIM(assignee_name) != ''
    GROUP BY LOWER(TRIM(assignee_name))
    ORDER BY count DESC
    LIMIT 12
    `,
    )
    .all() as { assignee: string; count: number | bigint }[];

  const days14 = lastDaysISO(14);
  const dayMin = days14[0] ?? "";

  const taskTrendRaw = db
    .prepare(
      `
    SELECT date(created_at) AS d, COUNT(*) AS c
    FROM tasks
    WHERE date(created_at) >= ?
    GROUP BY date(created_at)
    `,
    )
    .all(dayMin) as { d: string; c: number | bigint }[];

  const commentTrendRaw = db
    .prepare(
      `
    SELECT date(created_at) AS d, COUNT(*) AS c
    FROM task_comments
    WHERE date(created_at) >= ?
    GROUP BY date(created_at)
    `,
    )
    .all(dayMin) as { d: string; c: number | bigint }[];

  return {
    generatedAt,
    totals,
    boards,
    tasksByBoard,
    columnTasks,
    flowByBoard: buildFlowByBoard(columnTasks),
    priorityBreakdown: priorityRows.map((r) => ({
      key: r.key,
      count: asNumber(r.count),
    })),
    typeBreakdown: typeRows.map((r) => ({
      key: r.key,
      count: asNumber(r.count),
    })),
    assigneeLoad: assigneeRows.map((r) => ({
      assignee: r.assignee,
      tasks: asNumber(r.count),
    })),
    taskCreationTrend: fillTrend(days14, taskTrendRaw),
    commentTrend: fillTrend(days14, commentTrendRaw),
  };
}
