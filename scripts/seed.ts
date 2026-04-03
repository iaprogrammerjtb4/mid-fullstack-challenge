/**
 * Preloads one board with columns and tasks. From project root:
 *   bun run seed
 *   npm run seed
 *
 * If TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set, seeds the remote Turso DB.
 * Otherwise uses local file SQLite (data/app.db).
 *
 * Also upserts demo users (bcrypt):
 *   pm@example.com / password123  — role PM
 *   dev@example.com / password123 — role DEVELOPER
 */

import bcrypt from "bcryptjs";
import type { DatabaseSync } from "node:sqlite";
import { asNumber, sqlGet, sqlRun } from "../src/lib/db";
import { getLocalDb } from "../src/lib/sqlite-local";

type DemoRole = "PM" | "DEVELOPER";
type DemoPriority = "high" | "medium" | "low";
type DemoTaskType = "story" | "task" | "bug";

const BOARD_NAME = "Customer Support Portal Launch";

const DEMO_USERS = [
  { email: "pm@example.com", password: "password123", role: "PM" as const },
  {
    email: "dev@example.com",
    password: "password123",
    role: "DEVELOPER" as const,
  },
] as const;

const DEMO_COLUMNS = [
  "Discovery",
  "Planning",
  "Build",
  "QA and UAT",
  "Launch",
  "Done",
] as const;

type DemoColumnName = (typeof DEMO_COLUMNS)[number];

type DemoComment = {
  authorEmail: string;
  body: string;
};

type DemoTask = {
  column: DemoColumnName;
  title: string;
  description: string;
  priority: DemoPriority;
  taskType: DemoTaskType;
  assigneeName: string;
  comments?: DemoComment[];
};

const DEMO_TASKS: DemoTask[] = [
  {
    column: "Discovery",
    title: "Run kickoff with Support and Ops",
    description:
      "Confirm MVP scope, launch date, service goals, and stakeholders for the new customer support portal.",
    priority: "high",
    taskType: "story",
    assigneeName: "Ana Torres",
    comments: [
      {
        authorEmail: "pm@example.com",
        body:
          "Kickoff approved. MVP must cover queue triage, SLA visibility, and clean handoff between support tiers.",
      },
    ],
  },
  {
    column: "Discovery",
    title: "Audit current ticket flow and SLA breaches",
    description:
      "Document manual steps, bottlenecks, and the top reasons why tickets miss first-response targets.",
    priority: "medium",
    taskType: "task",
    assigneeName: "Luis Vega",
  },
  {
    column: "Planning",
    title: "Design agent dashboard and triage states",
    description:
      "Define board states, agent workflow, and the main user journeys for triage, assignment, and resolution.",
    priority: "high",
    taskType: "story",
    assigneeName: "Marta Ruiz",
  },
  {
    column: "Planning",
    title: "Define roles, permissions, and audit logging",
    description:
      "Specify PM, support lead, and developer access rules plus the audit trail needed for ticket ownership changes.",
    priority: "high",
    taskType: "task",
    assigneeName: "Carlos Medina",
    comments: [
      {
        authorEmail: "dev@example.com",
        body:
          "Security review requested immutable logs for reassignment and escalation events before release.",
      },
    ],
  },
  {
    column: "Build",
    title: "Implement queue assignment API",
    description:
      "Create validation, ownership rules, and conflict handling so two agents cannot claim the same ticket at once.",
    priority: "high",
    taskType: "story",
    assigneeName: "Diego Paredes",
    comments: [
      {
        authorEmail: "pm@example.com",
        body:
          "Frontend contract approved. Keep the API idempotent because support agents often double-click on slow networks.",
      },
    ],
  },
  {
    column: "Build",
    title: "Build board view for support workflow",
    description:
      "Render columns, task cards, comments, assignee badges, and the main actions agents use during live operations.",
    priority: "high",
    taskType: "story",
    assigneeName: "Sofia Pena",
  },
  {
    column: "Build",
    title: "Import legacy tickets from CSV",
    description:
      "Normalize historical exports, preserve reporter metadata, and map old priority values to the new model.",
    priority: "medium",
    taskType: "task",
    assigneeName: "Ivan Salazar",
  },
  {
    column: "QA and UAT",
    title: "Run regression on role-based access",
    description:
      "Verify PM and developer permissions, admin-only screens, and the limits on who can create or delete work items.",
    priority: "high",
    taskType: "task",
    assigneeName: "Andrea Gil",
  },
  {
    column: "QA and UAT",
    title: "Fix timezone bug in SLA countdown",
    description:
      "Resolve the mismatch between local browser time and UTC deadlines that caused false overdue alerts in LATAM.",
    priority: "high",
    taskType: "bug",
    assigneeName: "Diego Paredes",
    comments: [
      {
        authorEmail: "dev@example.com",
        body:
          "Root cause confirmed: the client was formatting local midnight instead of the stored UTC deadline.",
      },
    ],
  },
  {
    column: "Launch",
    title: "Configure production secrets and monitoring",
    description:
      "Verify AUTH, Turso, LiveKit, health checks, and error alerts before opening the portal to the support team.",
    priority: "high",
    taskType: "task",
    assigneeName: "Valentina Cruz",
    comments: [
      {
        authorEmail: "dev@example.com",
        body:
          "Preview smoke test passed with Vercel, Turso, and LiveKit. Remaining step is final cutover approval.",
      },
    ],
  },
  {
    column: "Launch",
    title: "Dry run go-live checklist with stakeholders",
    description:
      "Walk through rollback steps, ownership matrix, communications, and first-day incident response protocol.",
    priority: "medium",
    taskType: "task",
    assigneeName: "Paula Rojas",
  },
  {
    column: "Done",
    title: "Publish rollout guide for support agents",
    description:
      "Share onboarding notes, fallback process, and a first-week support plan for the operations team.",
    priority: "low",
    taskType: "story",
    assigneeName: "Paula Rojas",
  },
  {
    column: "Done",
    title: "Complete post-launch KPI review",
    description:
      "Compare backlog age, first response time, and reassignment rate against baseline after the first release window.",
    priority: "medium",
    taskType: "story",
    assigneeName: "Ana Torres",
    comments: [
      {
        authorEmail: "pm@example.com",
        body:
          "Week 1 outcome: first response time down 18% and manual reassignment down 23% against baseline.",
      },
    ],
  },
];

function tursoFromEnv(): boolean {
  return Boolean(
    process.env.TURSO_DATABASE_URL?.trim() &&
      process.env.TURSO_AUTH_TOKEN?.trim(),
  );
}

function upsertUserLocal(
  db: DatabaseSync,
  email: string,
  plainPassword: string,
  role: DemoRole,
) {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const existing = db
    .prepare(`SELECT id FROM users WHERE email = ?`)
    .get(email) as { id: number } | undefined;
  if (existing) {
    db.prepare(
      `UPDATE users SET password_hash = ?, role = ? WHERE email = ?`,
    ).run(hash, role, email);
  } else {
    db.prepare(
      `INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`,
    ).run(email, hash, role);
  }
}

async function upsertUserTurso(
  email: string,
  plainPassword: string,
  role: DemoRole,
) {
  const hash = bcrypt.hashSync(plainPassword, 10);
  const existing = await sqlGet<{ id: number }>(
    `SELECT id FROM users WHERE email = ?`,
    [email],
  );
  if (existing) {
    await sqlRun(`UPDATE users SET password_hash = ?, role = ? WHERE email = ?`, [
      hash,
      role,
      email,
    ]);
  } else {
    await sqlRun(`INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)`, [
      email,
      hash,
      role,
    ]);
  }
}

function seedBoardLocal(db: DatabaseSync) {
  const existing = db
    .prepare(`SELECT id FROM boards WHERE name = ?`)
    .get(BOARD_NAME) as { id: number } | undefined;
  if (existing) {
    db.prepare(`DELETE FROM boards WHERE id = ?`).run(existing.id);
  }

  const rBoard = db.prepare(`INSERT INTO boards (name) VALUES (?)`).run(BOARD_NAME);
  const boardId = Number(rBoard.lastInsertRowid);

  const insertColumn = db.prepare(
    `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
  );
  const insertTask = db.prepare(
    `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`,
  );
  const insertComment = db.prepare(
    `INSERT INTO task_comments (task_id, author_email, body) VALUES (?, ?, ?)`,
  );

  const columnIds = new Map<DemoColumnName, number>();
  for (const [index, columnName] of DEMO_COLUMNS.entries()) {
    const info = insertColumn.run(boardId, columnName, index);
    columnIds.set(columnName, Number(info.lastInsertRowid));
  }

  for (const task of DEMO_TASKS) {
    const columnId = columnIds.get(task.column);
    if (!columnId) {
      throw new Error(`Missing seeded column: ${task.column}`);
    }

    const info = insertTask.run(
      columnId,
      task.title,
      task.description,
      task.priority,
      task.taskType,
      task.assigneeName,
    );
    const taskId = Number(info.lastInsertRowid);

    for (const comment of task.comments ?? []) {
      insertComment.run(taskId, comment.authorEmail, comment.body);
    }
  }

  return boardId;
}

function seedLocal() {
  const db = getLocalDb();

  for (const user of DEMO_USERS) {
    upsertUserLocal(db, user.email, user.password, user.role);
  }
  console.log("Users: pm@example.com & dev@example.com — password: password123");

  const boardId = seedBoardLocal(db);
  console.log(`Seed OK (local). Board id=${boardId} ("${BOARD_NAME}")`);
}

async function seedBoardTurso() {
  const existing = await sqlGet<{ id: number }>(
    `SELECT id FROM boards WHERE name = ?`,
    [BOARD_NAME],
  );
  if (existing) {
    await sqlRun(`DELETE FROM boards WHERE id = ?`, [existing.id]);
  }

  const rBoard = await sqlRun(`INSERT INTO boards (name) VALUES (?)`, [BOARD_NAME]);
  const boardId = asNumber(rBoard.lastInsertRowid);

  const columnIds = new Map<DemoColumnName, number>();
  for (const [index, columnName] of DEMO_COLUMNS.entries()) {
    const info = await sqlRun(
      `INSERT INTO columns (board_id, name, display_order) VALUES (?, ?, ?)`,
      [boardId, columnName, index],
    );
    columnIds.set(columnName, asNumber(info.lastInsertRowid));
  }

  const taskSql =
    `INSERT INTO tasks (column_id, title, description, priority, task_type, assignee_name) VALUES (?, ?, ?, ?, ?, ?)`;
  const commentSql =
    `INSERT INTO task_comments (task_id, author_email, body) VALUES (?, ?, ?)`;

  for (const task of DEMO_TASKS) {
    const columnId = columnIds.get(task.column);
    if (!columnId) {
      throw new Error(`Missing seeded column: ${task.column}`);
    }

    const info = await sqlRun(taskSql, [
      columnId,
      task.title,
      task.description,
      task.priority,
      task.taskType,
      task.assigneeName,
    ]);
    const taskId = asNumber(info.lastInsertRowid);

    for (const comment of task.comments ?? []) {
      await sqlRun(commentSql, [taskId, comment.authorEmail, comment.body]);
    }
  }

  return boardId;
}

async function seedTurso() {
  for (const user of DEMO_USERS) {
    await upsertUserTurso(user.email, user.password, user.role);
  }
  console.log("Users: pm@example.com & dev@example.com — password: password123");

  const boardId = await seedBoardTurso();
  console.log(`Seed OK (Turso). Board id=${boardId} ("${BOARD_NAME}")`);
}

async function main() {
  if (tursoFromEnv()) {
    await seedTurso();
  } else {
    seedLocal();
  }
}

void main().catch((err) => {
  console.error(err);
  process.exit(1);
});
