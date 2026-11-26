# Soft Store (website + API in one)

One Node service: Express serves the React site **and** the API
(`/api/app-config`, `/api/files`, `/api/store`, `/api/admin`), with files stored
in Telegram and metadata in Postgres.

```
backend/    Express API  (see backend/README.md for every endpoint)
frontend/   React + Vite site (built into frontend/dist, served by the backend)
```

## Host it (any Node host, e.g. Render / Railway / a VPS)
- **Build command:** `npm run build`
- **Start command:** `npm start`
- **Env vars:** see `.env.example` (`DATABASE_URL`, `ADMIN_KEY`, `VITE_ADMIN_KEY`,
  `TELEGRAM_BOT_TOKENS`, `TELEGRAM_CHAT_IDS`, `PUBLIC_URL`)

`render.yaml` is included, so on Render you can use **New → Blueprint**.
`VITE_*` variables are read at *build* time — change one, then redeploy.

## Run locally
```bash
npm run install:all
# terminal 1 (API on :3000)
DATABASE_URL=postgres://... ADMIN_KEY=secret TELEGRAM_BOT_TOKENS=... TELEGRAM_CHAT_IDS=... npm run dev:api
# terminal 2 (site on :5173, proxies /api to :3000)
npm run dev:web
```
Or production-style on one port: `npm run build && npm start` → http://localhost:3000

## Appearance and developer settings update

- Soft Store keeps its black/white dark appearance as the default.
- Settings > Appearance & personalization supports light/dark mode and a user-selected accent colour, persisted in local storage.
- Settings > Developer account adds a basic publisher profile screen and lists the required APK and cover-image submission rules.

**Publishing backend requirement:** the current API exposes app uploads only behind the global `ADMIN_KEY` and does not have per-user developer authentication/ownership. The developer profile in this update is therefore a local UI profile only; it does not grant publishing permission and does not upload APKs. Before enabling real uploads, add server-side developer registration/login, authenticated developer sessions, per-developer app ownership, and server-side validation for a JPEG cover image that is exactly 1028 × 720 pixels. Do not expose `ADMIN_KEY` in frontend code.
