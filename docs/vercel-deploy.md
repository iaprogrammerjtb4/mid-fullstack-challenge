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
| `TURSO_DATABASE_URL` | URL de la base **libSQL** (Turso), ej. `libsql://tu-db.turso.io` — **recomendado en Vercel** para datos persistentes compartidos |
| `TURSO_AUTH_TOKEN` | Token de autenticación de Turso (junto con la URL anterior activa el modo remoto) |
| `TURSO_SKIP_DEMO_USERS` | Si vale `1`, no se insertan usuarios demo en Turso cuando la tabla `users` está vacía (útil en producción real) |

Tras guardar variables, vuelve a desplegar (**Redeploy**) para que el build las inyecte.

### Si al iniciar sesión ves `error=Configuration` o “correo incorrecto” pero la red devuelve `/api/auth/error?error=Configuration`

Eso casi siempre es **falta de `AUTH_SECRET` en runtime** (no solo en build). Comprueba en Vercel:

1. **`AUTH_SECRET`** definida para **Production** y un **Redeploy** después de guardarla.
2. **`AUTH_URL`** = la URL exacta del sitio, p. ej. `https://tu-proyecto.vercel.app` (sin `/` final).

Generar secreto en Windows (sin OpenSSL):  
`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`

---

## 3. Base de datos: Turso en Vercel (recomendado)

En **local**, la app usa un archivo **`data/app.db`** (`node:sqlite`).

En **Vercel**, para que **tableros, tareas y usuarios** sean **los mismos en todas las instancias** serverless, configura **[Turso](https://turso.tech)** (SQLite hospedado, protocolo libSQL):

1. Crea una base en el panel de Turso y obtén **URL** + **token**.
2. En Vercel añade **`TURSO_DATABASE_URL`** y **`TURSO_AUTH_TOKEN`** (Production; incluye **Build** si tu proyecto separa entornos en el paso de build).
3. Redeploy. Al arrancar, `src/lib/db.ts` ejecuta el DDL/migraciones necesarias sobre Turso.

**Usuarios y seed:**

- Con Turso, si la tabla `users` está **vacía** en el primer arranque, se insertan **`pm@example.com`** y **`dev@example.com`** (`password123`), igual que en el fallback de Vercel con `/tmp`. Para evitarlo (producción real), define **`TURSO_SKIP_DEMO_USERS=1`** y crea usuarios por tu flujo o con **`npm run seed`** cargando las variables Turso en el entorno.
- Para cargar el tablero de ejemplo, ejecuta **`npm run seed`** con **`TURSO_DATABASE_URL`** y **`TURSO_AUTH_TOKEN`** en el entorno (p. ej. `.env.local`); el script detecta Turso y escribe en la nube. Sin esas variables, el seed usa solo el archivo local `data/app.db`.

### Sin Turso (solo `/tmp` en Vercel)

Si **no** defines URL + token, la app sigue usando SQLite bajo **`/tmp`** (véase `src/lib/sqlite-local.ts`). Eso **no** es persistente entre instancias. En ese modo, si `users` está vacío, se pueden insertar **`pm@example.com`** / **`dev@example.com`** (`password123`) salvo **`VERCEL_SKIP_DEMO_USERS=1`**.

### Otros hosts (Railway, VPS, etc.)

Si despliegas en un servicio con **disco persistente**, puedes seguir usando el archivo `data/app.db` y `npm run seed` como en local, sin Turso.

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
2. Con **Turso**, tras el primer request la app rellena usuarios demo si la tabla estaba vacía (salvo `TURSO_SKIP_DEMO_USERS=1`). También puedes usar **`npm run seed`** con las variables Turso en el entorno para el tablero de ejemplo.
3. Abre `https://tu-app.vercel.app` (o tu dominio) y prueba login.

---

## 7. Archivo `vercel.json`

En la raíz del repo hay un `vercel.json` mínimo con `"framework": "nextjs"`. Puedes ajustar `installCommand` si usas solo `pnpm` o `bun` en Vercel (y configurar el mismo gestor en el panel del proyecto).

---

## Resumen

| Componente | ¿Funciona en Vercel “tal cual”? |
| ---------- | -------------------------------- |
| Next.js (UI + API routes) | Sí, tras configurar `AUTH_*`. |
| Datos persistentes compartidos | Sí, con **`TURSO_DATABASE_URL`** + **`TURSO_AUTH_TOKEN`**. Sin ellos, SQLite en `/tmp` no es fiable para producción. |
| Socket.io (`bun run socket`) | **No** en el mismo proyecto; servicio externo + `NEXT_PUBLIC_CHAT_SOCKET_URL`. |
| LiveKit | Sí, con variables de entorno. |
