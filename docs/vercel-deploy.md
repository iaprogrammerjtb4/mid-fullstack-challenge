# Desplegar FlowKanban en Vercel

Esta guía asume que el código está en **GitHub**, **GitLab** o **Bitbucket** conectado a [Vercel](https://vercel.com).

---

## 1. Crear el proyecto en Vercel

1. Entra en [vercel.com](https://vercel.com) → **Add New…** → **Project**.
2. **Import** el repositorio de este challenge.
3. **Framework Preset:** Next.js (se detecta solo).
4. **Root Directory:** `./` (raíz del repo).
5. **Build Command:** `npm run build` (por defecto).
6. **Output:** dejar el que propone Next.js.

### Versión de Node

En **Project → Settings → General → Node.js Version** elige **22.x** (el proyecto declara `engines.node` ≥ 22.5 por `node:sqlite`).

---

## 2. Variables de entorno (Production)

En **Project → Settings → Environment Variables**, añade al menos:

| Variable | Entorno | Descripción |
| -------- | ------- | ----------- |
| `AUTH_SECRET` | Production (y **Build** si Vercel lo separa) | Obligatorio en **runtime** para sesiones. Genera uno: `openssl rand -base64 32`. El código permite el build sin esta variable; aun así conviene definirla también para el paso de build si tu panel lo distingue. |
| `AUTH_URL` | Production | URL pública del sitio, **sin barra final**. Ej: `https://tu-app.vercel.app` |

Opcionales (si usas esas funciones):

| Variable | Descripción |
| -------- | ----------- |
| `NEXT_PUBLIC_CHAT_SOCKET_URL` | URL pública del **servidor Socket.io** (ver abajo). Ej: `https://tu-socket.up.railway.app` |
| `NEXT_PUBLIC_LIVEKIT_URL` | WebSocket de LiveKit, ej. `wss://xxx.livekit.cloud` |
| `LIVEKIT_API_KEY` | Clave API LiveKit (servidor) |
| `LIVEKIT_API_SECRET` | Secreto LiveKit (servidor) |

Tras guardar variables, vuelve a desplegar (**Redeploy**) para que el build las inyecte.

---

## 3. Limitación importante: SQLite en archivo

La app usa **SQLite** en `data/app.db` en disco local.

En **Vercel** las funciones son **serverless**: no hay un disco persistente compartido entre invocaciones; el sistema de archivos de despliegue es **de solo lectura** salvo `/tmp` (y no sirve como base de datos duradera).

**Conclusión:** el código actual **no puede usar el mismo SQLite de escritorio** en producción en Vercel de forma fiable. Tienes dos caminos:

### Opción A — Mantener SQLite sin reescribir la app (recomendada a corto plazo)

Despliega el **mismo proyecto** en un servicio con **disco persistente** o contenedor de larga duración, por ejemplo:

- [Railway](https://railway.app) (Web Service + volumen, o sin volumen ejecutando seed en cada deploy según tu estrategia)
- [Render](https://render.com) (Web Service)
- [Fly.io](https://fly.io) (máquina + volumen)
- Un **VPS** con Node 22 + `npm run build` + `npm start`

Ahí `data/app.db` puede persistir y `npm run seed` se ejecuta una vez (o en el pipeline) como en local.

### Opción B — Seguir en Vercel

Necesitas **migrar la capa de datos** a algo remoto compatible con serverless, por ejemplo:

- [Turso](https://turso.tech) (SQLite remoto + `@libsql/client`) — requiere adaptar `src/lib/db.ts` y las llamadas (API **asíncrona**).
- [Neon](https://neon.tech) / [Vercel Postgres](https://vercel.com/storage/postgres) / Supabase — requiere SQL distinto o ORM y migraciones.

Eso es un cambio de arquitectura; hasta hacerlo, **no esperes datos persistentes** en Vercel con el `db.ts` actual.

---

## 4. Chat en tiempo real (Socket.io)

`npm run socket` / `bun run socket` arranca un **proceso aparte** (p. ej. puerto 3001). **Vercel no ejecuta ese proceso** junto con Next.js.

Debes:

1. Desplegar el script `scripts/socket-chat-server.ts` en **otro** host (Railway, Render, Fly, etc.).
2. Definir en Vercel `NEXT_PUBLIC_CHAT_SOCKET_URL` con la URL **HTTPS/WSS** pública de ese servicio (y CORS/origen permitido hacia tu dominio Vercel).

Sin eso, el chat en tablero puede quedar desconectado en producción.

---

## 5. LiveKit (voz / video)

LiveKit ya es un servicio en la nube. Configura las variables de la tabla anterior con un proyecto en [LiveKit Cloud](https://cloud.livekit.io). No dependen de Vercel salvo por exponer las variables al runtime de Next.

---

## 6. Tras el primer deploy

1. Comprueba que `AUTH_URL` coincide exactamente con la URL de producción (incluido `https` y sin `/` final incorrecta).
2. Si usas base **remota** o **disco persistente**, ejecuta **`npm run seed`** (o tu script SQL) **contra esa base** para crear usuarios demo (`pm@example.com` / `dev@example.com`, etc.).
3. Abre `https://tu-app.vercel.app` (o tu dominio) y prueba login.

---

## 7. Archivo `vercel.json`

En la raíz del repo hay un `vercel.json` mínimo con `"framework": "nextjs"`. Puedes ajustar `installCommand` si usas solo `pnpm` o `bun` en Vercel (y configurar el mismo gestor en el panel del proyecto).

---

## Resumen

| Componente | ¿Funciona en Vercel “tal cual”? |
| ---------- | -------------------------------- |
| Next.js (UI + API routes) | Sí, tras configurar `AUTH_*`. |
| SQLite en `data/app.db` | **No** de forma persistente; migrar DB o desplegar en otro host. |
| Socket.io (`bun run socket`) | **No** en el mismo proyecto; servicio externo + `NEXT_PUBLIC_CHAT_SOCKET_URL`. |
| LiveKit | Sí, con variables de entorno. |

Si quieres **solo Vercel** sin otro proveedor, el siguiente paso técnico es **sustituir `src/lib/db.ts`** por un cliente remoto (Turso o Postgres) y volver a ejecutar migraciones/seed contra esa base.
