# TaskNest 🪺

A minimal full-stack task board app built to **test [Solarch](https://www.npmjs.com/package/solarch)** — a PocketBase-style backend-as-a-service for Node.js (SQLite, auth, collections, realtime, file storage, all in one npm package).

## Stack

| Layer    | Tech                                |
| -------- | ----------------------------------- |
| Backend  | **Solarch** v0.15.6 (Node.js/SQLite)|
| Frontend | **Next.js** 16 (App Router) + Tailwind CSS |
| Auth     | Solarch built-in auth (JWT)         |

## Features

- 🔐 Email/password auth (register, login, logout)
- 🏗️ Workspaces — group your projects
- 📋 Kanban boards — lists + task cards
- 📝 Task details — description, move between lists
- 📎 File attachments on tasks
- 🗑️ Cascade delete (lists → tasks)
- 🌙 Dark theme UI

## Quick Start

### Backend

```bash
cd backend
cp .env.example .env          # edit with your admin credentials
npm install
npm run dev                   # starts on http://localhost:8090

# First run — set up the database:
node scripts/setup-collections.js
node scripts/setup-rules.js

# Verify everything works:
node scripts/test-rules.js
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local   # edit API_URL if needed
npm install
npm run dev                        # starts on http://localhost:3000
```

## Deployment

### Backend → Render

1. Push the repo to GitHub.
2. Create a new **Web Service** on [Render](https://render.com).
3. Set the root directory to `backend/`.
4. Set build command: `npm install`
5. Set start command: `npx tsx src/server.ts`
6. Add environment variables: `SOLARCH_JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CORS_ALLOWED_ORIGINS`, `NODE_ENV=production`.
7. Add a **Disk** (1 GB, mount path `/opt/render/project/src/pb_data`).
8. After deploy, run setup scripts with `API_URL` set to the Render URL:
   ```bash
   API_URL=https://your-app.onrender.com node scripts/setup-collections.js
   API_URL=https://your-app.onrender.com node scripts/setup-rules.js
   ```

### Frontend → Vercel

1. Create a new project on [Vercel](https://vercel.com).
2. Set the root directory to `frontend/`.
3. Add env var: `NEXT_PUBLIC_API_URL=https://your-backend.onrender.com`
4. Deploy.

## Solarch Bugs Found

See [docs/PACKAGE-ISSUES.md](docs/PACKAGE-ISSUES.md) for a comprehensive list of **9 bugs** discovered during development:

| # | Severity | Summary |
|---|----------|---------|
| 1 | 🔴 | Admin UI not built into npm package |
| 2 | 🔴 | Admin tokens don't bypass rules on auth collections |
| 3 | 🔴 | Collection PATCH with fields array corrupts field IDs |
| 4 | 🟡 | `collectionName` empty in returned records |
| 5 | 🔴 | JS hook `onRecordCreate` tag parameter silently discarded |
| 6 | 🔴 | `onRecordCreate`/Update/Delete hooks never triggered |
| 7 | 🔴 | `$app.newRecord()` missing from JSVM sandbox |
| 8 | 🔴 | `stripProtectedFields` strips `role` from ALL collections |
| 9 | 🔴 | `?=` operator not implemented in rule expressions |
| 10 | 🔴 | `canAccessRecord` doesn't pass `app` to resolver — breaks all relation rules |
| 11 | 🟡 | Auth collection create returns `{token, record}` not just record |
| 12 | 🔴 | SQLite reserved words not quoted in generated SQL |

## Project Structure

```
tasknest/
├── backend/
│   ├── src/server.ts              # Solarch entry point
│   ├── pb_hooks/                  # Server-side hooks (non-functional, see bugs)
│   ├── scripts/                   # Setup, rules, tests
│   ├── render.yaml                # Render deployment config
│   └── .env.example
├── frontend/
│   ├── src/app/                   # Next.js pages (App Router)
│   │   ├── page.tsx               # Landing page
│   │   ├── login/page.tsx         # Login
│   │   ├── register/page.tsx      # Register
│   │   ├── workspaces/page.tsx    # Workspace listing
│   │   ├── workspaces/[id]/boards/page.tsx  # Board listing
│   │   └── boards/[id]/page.tsx   # Kanban board view
│   ├── src/lib/api.ts             # Typed API wrapper
│   ├── src/contexts/auth-context.tsx
│   └── vercel.json
└── docs/
    ├── PLAN.md
    └── PACKAGE-ISSUES.md          # 12 bugs documented
```

## License

MIT