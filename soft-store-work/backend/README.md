# Soft Store backend

Tiny Express + Postgres API that stores the app-download config (MediaFire
link, version, changelog, iOS availability, download count) so every
visitor sees the same thing — not just the browser that last saved it.

## Endpoints
- `GET /api/app-config/:id` — public, returns the config (creates a
  default row the first time a given `:id` is read)
- `PUT /api/app-config/:id` — requires an `x-admin-key` header matching
  the `ADMIN_KEY` env var; merges the request body into the config
- `GET /health` — health check

## Environment variables
- `DATABASE_URL` — a Postgres connection string
- `ADMIN_KEY` — a secret string only the Admin dashboard should know

## Run locally
```
npm install
DATABASE_URL=postgres://... ADMIN_KEY=some-secret npm start
```

## Telegram file storage (thousands of files)

Files (APKs, etc.) are stored in private Telegram channels; Postgres only
keeps small metadata rows. Enabled when the Telegram env vars are set.

### How it scales
- Files are split into 19 MiB chunks (Bot API downloads max out at 20 MB) and
  re-assembled while streaming to the client. Range/resume is supported.
- Uploads are spread round-robin over **multiple bots and multiple channels**,
  so you aren't bound by one bot's rate limit or one channel.
- A `file_id` only works with the bot that uploaded it, so the bot id is stored
  per chunk — don't remove a bot from `TELEGRAM_BOT_TOKENS` while it still owns files.
- Listing uses keyset pagination, so it stays fast with 100k+ rows.

### Setup
1. Create 2–5 bots with @BotFather.
2. Create 1+ **private channels**, add every bot as an **admin** (post/delete messages).
3. Get each channel id (`-100…`): forward a channel post to @RawDataBot, or call `getUpdates`.
4. Set `TELEGRAM_BOT_TOKENS` and `TELEGRAM_CHAT_IDS` (see `.env.example`).

### Endpoints
- `POST /api/files` — admin; multipart fields: `file`, optional `appId`, `version`, `notes`
- `GET /api/files?appId=&limit=50&cursor=` — admin; list, newest first (`nextCursor` for more)
- `GET /api/files/:id` — metadata
- `GET /api/files/:id/download` — public, streams the file
- `DELETE /api/files/:id` — admin; also deletes the Telegram messages

Example:
```
curl -H "x-admin-key: $ADMIN_KEY" -F file=@SoftStore.apk -F version=v1.2.0 \
  https://your-api/api/files
```
Then set `apkUrl` in the app config to `https://your-api/api/files/<id>/download`.

### Notes
- Max upload size: `MAX_UPLOAD_MB` (default 500). Uploads go through a temp file on disk.
- Free hosts with ephemeral disks are fine; uploaded data lives in Telegram.
- Telegram storage is convenient but unofficial for hosting — keep a backup if the files matter.


## Play-Store-style catalog

Built on top of the file storage: apps, versions, icons/screenshots (all stored
in Telegram), ratings & reviews, search, charts and update checks.

### Public API (`/api/store`) — what your app/website calls
| Endpoint | What it does |
|---|---|
| `GET /home` | featured, top charts, trending, new & updated, categories |
| `GET /categories` | categories with app counts |
| `GET /apps?q=&category=&sort=top\|new\|rating\|trending&limit=&offset=` | search / browse (`nextOffset` for more) |
| `GET /apps/:package` | details: description, screenshots, rating + histogram, latest version |
| `GET /apps/:package/versions` | version history with changelogs |
| `GET /apps/:package/reviews?limit=&cursor=` | reviews |
| `POST /apps/:package/reviews` | `{rating:1-5, body?, author?}` + `x-device-id` header (one review per device, re-posting edits it) |
| `GET /apps/:package/download` | latest APK (resumable) |
| `GET /apps/:package/versions/:code/download` | a specific APK |
| `GET /updates?packages=com.a:12,com.b:3` | installed `package:versionCode` pairs → apps that have a newer version |

Download counts show as Play-Store buckets (`"downloadsLabel": "10K+"`); the
"Trending" chart uses per-day download counters.

### Admin API (`/api/admin`) — send `x-admin-key` on every call
```bash
H="x-admin-key: $ADMIN_KEY"; API=https://your-api

# 1. create the app (stays hidden until it has a version AND status=published)
curl -H "$H" -H "Content-Type: application/json" -X POST $API/api/admin/apps -d \
 '{"packageName":"com.example.notes","title":"Notes","shortDescription":"Simple notes",
   "description":"...","developer":"Me","category":"productivity","tags":["notes"],"status":"published"}'

# 2. artwork
curl -H "$H" -F icon=@icon.png $API/api/admin/apps/com.example.notes/icon
curl -H "$H" -F feature=@banner.png $API/api/admin/apps/com.example.notes/feature
curl -H "$H" -F screenshots=@1.png -F screenshots=@2.png $API/api/admin/apps/com.example.notes/screenshots

# 3. upload an APK version (this is what makes the app visible)
curl -H "$H" -F apk=@notes.apk -F versionName=1.0.0 -F versionCode=1 -F minSdk=24 \
  -F "changelog=First release" $API/api/admin/apps/com.example.notes/versions
```
Other admin routes: `GET/PUT/DELETE /apps/:package`, `GET /apps?status=draft`,
`DELETE /apps/:package/versions/:code`, `DELETE /apps/:package/screenshots/:fileId`,
`DELETE /reviews/:id`. Set `"featured": true` on an app to put it in the Featured row.
