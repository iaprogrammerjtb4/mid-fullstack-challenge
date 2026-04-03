# Challenge Fullstack Mid-Level — Solución

Solución para [Red-Valley/mid-fullstack-challenge](https://github.com/Red-Valley/mid-fullstack-challenge): un **tablero tipo Kanban** con **API REST**, **SQLite** e interfaz **Next.js (App Router)** con **Tailwind CSS**. La entrada se valida con **Zod**; las respuestas usan un único formato JSON para éxito y error.

**Runtime:** [Bun](https://bun.sh) (según el brief) o **Node.js ≥ 22.5** (necesario para [`node:sqlite`](https://nodejs.org/api/sqlite.html)). El mismo código funciona con `bun` o `npm`.

*[English version →](./README.en.md)*

---

## Inicio rápido

Copia `.env.example` a `.env.local` y define **`AUTH_SECRET`** (p. ej. salida de `openssl rand -base64 32`). Sin esto, Auth.js fallará al iniciar sesión o al hacer build.

```bash
# Instalar dependencias (usa un solo gestor de paquetes de forma consistente)
bun install
# o: npm install

# Carga tablero de ejemplo y usuarios demo (ver abajo)
bun run seed
# o: npm run seed

# Servidor de desarrollo
bun run dev
# o: npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) → te redirige a **/login** si no hay sesión. Tras el seed, usuarios de prueba:

| Email | Rol | Contraseña |
| ----- | --- | ------------ |
| `pm@example.com` | PM | `password123` |
| `dev@example.com` | DEVELOPER | `password123` |

El **PM** puede crear tableros (`/create-board`), columnas, tareas, asignar responsables y eliminar. El **DEVELOPER** mueve tareas (arrastrar o menú según UI) y comenta; no crea tableros ni ve “New board” / eliminar tareas.

### Versión de Node (npm / sin Bun)

Si usas **nvm** (por ejemplo nvm-windows), el repo incluye `.nvmrc` (`22`):

```bash
nvm install 22
nvm use 22
node -v   # debería ser v22.x (≥ 22.5)
```

---

## Qué incluye

| Área | Notas |
| ---- | ----- |
| **Tableros y columnas** | Crear tableros; añadir columnas con orden de visualización (único por tablero). |
| **Tareas** | Crear, actualizar (incluido mover a otra columna del **mismo** tablero), eliminar. |
| **API** | Todas las rutas requeridas; validación; HTTP 400 / 404 / 409 cuando corresponde; envoltorio JSON uniforme. |
| **UI** | Lista de tableros, columnas Kanban, **modal** para nuevas tareas, **desplegable** para mover tareas, **arrastrar y soltar** entre columnas (extra), estados de carga y vacíos. |
| **Datos** | Archivo SQLite `data/app.db` (se crea al primer uso; **ignorado por git**). |
| **Seed** | `scripts/seed.ts` — un tablero de ejemplo con columnas y tareas. |

### Campos opcionales (más allá del mínimo del brief)

Las tareas también admiten **`taskType`** (`bug` \| `story` \| `task`), **`assigneeName`** (mostrado como iniciales en las tarjetas), y la UI incluye badges de prioridad y un layout ligero tipo “enterprise”. El esquema mínimo del challenge (nombre/fecha de creación, columnas, título/descripción/prioridad/fecha de tarea) queda **totalmente cubierto**.

---

## Scripts

| Comando | Descripción |
| ------- | ----------- |
| `bun run dev` / `npm run dev` | Servidor de desarrollo Next.js (Turbopack) |
| `bun run build` / `npm run build` | Build de producción |
| `bun run start` / `npm start` | Ejecutar el build de producción |
| `bun run seed` / `npm run seed` | Seed del tablero **Sample board** (idempotente: sustituye un tablero existente con el mismo nombre) |
| `bun run lint` / `npm run lint` | ESLint |

---

## Resumen de la API

Todas las respuestas JSON siguen:

- **Éxito:** `{ "ok": true, "data": … }`
- **Error:** `{ "ok": false, "error": { "code", "message", "details?" } }`

| Método | Ruta | Descripción |
| ------ | ---- | ----------- |
| `GET` | `/api/boards` | Listar tableros |
| `POST` | `/api/boards` | Cuerpo: `{ "name" }` |
| `GET` | `/api/boards/:id` | Tablero con columnas y tareas anidadas |
| `POST` | `/api/columns` | Cuerpo: `{ "boardId", "name", "displayOrder" }` |
| `POST` | `/api/tasks` | Cuerpo: `{ "columnId", "title", "description?", "priority?", "taskType?", "assigneeName?" }` |
| `PATCH` | `/api/tasks/:id` | Actualización parcial: `title`, `description`, `columnId` (solo mismo tablero), `priority`, `taskType`, `assigneeName` |
| `DELETE` | `/api/tasks/:id` | Eliminar tarea |

Detalle de implementación: `src/app/api/**`, esquemas en `src/lib/schemas.ts`, helpers en `src/lib/api-response.ts`.

---

## Arquitectura y decisiones de diseño

- **`src/lib/sqlite-local.ts` + `src/lib/db.ts`** — En local: SQLite en `data/app.db` con **`node:sqlite`**. Si existen **`TURSO_DATABASE_URL`** y **`TURSO_AUTH_TOKEN`**, la app usa **Turso** (`@libsql/client`) para una base compartida en serverless. Las consultas pasan por **`sqlGet` / `sqlAll` / `sqlRun`** (async).
- **`src/lib/schemas.ts` + `src/lib/api-response.ts`** — Zod en todas las rutas que mutan y en los ids; formato de error compartido y flatten de Zod para 400.
- **`src/app/api/**`** — Handlers finos: parsear → validar → consultar → devolver JSON (sin ORM).
- **`src/app/page.tsx`** — Lista de tableros y crear tablero.
- **`src/app/boards/[id]/page.tsx`** — Kanban: columnas, tarjetas (`src/components/kanban/`), modal para nuevas tareas, mover con `<select>` y arrastrar y soltar opcional.

**Trade-offs:** `node:sqlite` sigue siendo experimental en Node; exigir **≥ 22.5** mantiene el comportamiento predecible. El `display_order` de la columna es único por tablero (simple; en producción podrían usarse índices fraccionarios o un endpoint de reordenación). El orden de tareas dentro de una columna sigue `created_at` (al mover solo se actualiza `column_id`; no hay clave de orden dentro de la columna).

---

## Base de datos

- **Tipo:** SQLite (un solo archivo).
- **Ubicación:** `data/app.db` en la raíz del proyecto (ignorado por git).
- **Inspección:** Cualquier cliente SQLite (por ejemplo [DB Browser for SQLite](https://sqlitebrowser.org/)) o la CLI, con el servidor de desarrollo detenido o en solo lectura si tu herramienta lo permite.

---

## Despliegue en Vercel

1. Conecta el repo a [Vercel](https://vercel.com), framework **Next.js**, Node **22.x**.
2. Variables mínimas en producción: **`AUTH_SECRET`** y **`AUTH_URL`** (URL pública del deploy, sin barra final).
3. **Base de datos en producción:** configura **[Turso](https://turso.tech)** — **`TURSO_DATABASE_URL`** y **`TURSO_AUTH_TOKEN`**. Con Turso, si la tabla `users` está vacía, la app crea las cuentas demo (`pm@example.com` / `dev@example.com`, `password123`) salvo **`TURSO_SKIP_DEMO_USERS=1`**. Sin Turso, la app usa SQLite en **`/tmp`** (no persistente entre instancias); ahí aplica **`VERCEL_SKIP_DEMO_USERS`** para desactivar el auto-demo local.
4. El **chat Socket.io** (`bun run socket`) debe correr en **otro servicio**; en Vercel define **`NEXT_PUBLIC_CHAT_SOCKET_URL`** apuntando a esa URL.

Guía detallada (variables, LiveKit, limitaciones): **[`docs/vercel-deploy.md`](./docs/vercel-deploy.md)**. En la raíz hay un **`vercel.json`** mínimo para el preset de Next.js.

---

## Asistencia con IA

Gran parte de este proyecto se desarrolló con **Claude Code** y **Cursor** (agente, planificación y edición asistida), combinando flujos de trabajo tipo *prompts* orientados a velocidad y calidad — en la línea de materiales como *“7 prompts para programar más rápido”* (PDF de referencia en el flujo de trabajo del autor).

En Cursor se apoyó en **Skills** y contextos especializados, entre otros:

- **Arquitectura de software** — decisiones de capas, API, datos y límites del dominio.
- **Desarrollo backend** — rutas REST, validación, SQLite y contratos JSON coherentes.
- **Voz sobre IP (VoIP) y comunicaciones en tiempo real** — donde aplica al tablero (chat, llamadas / salas, señalización y consideraciones de medios).
- **Streaming y datos en vivo** — patrones para eventos en tiempo casi real, sockets o canales equivalentes usados en la solución.

El resultado se **revisó y ajustó manualmente** para cumplir el brief del challenge y poder defender cada decisión en una revisión técnica.
