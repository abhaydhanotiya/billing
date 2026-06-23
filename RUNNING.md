# Running Sanskar Palace (this machine)

Everything is installed and the database is set up. This is the day-to-day run guide.

## Local setup on this PC

- **PostgreSQL**: portable install at `D:\pg\pgsql`, data at `D:\pg\data`, listening on **port 5433**
  (port 5432 was already taken by another PostgreSQL on this machine, so we use 5433).
  - DB name: `sanskar`, user: `postgres`, password: `postgres`
  - The server's `packages/server/.env` already points at `localhost:5433`.
- It is **not** a Windows service, so it does **not** auto-start after a reboot — start it manually.

## Every time you want to use the app

From `D:\Sanskar Palace\billing`:

```powershell
pnpm db:up      # 1. start PostgreSQL (only needed once per Windows session / after reboot)
pnpm dev        # 2. start the API server + desktop app together (live reload)
```

Then in the app window:
- Server address: `http://localhost:4000`
- Login: **admin / 1234**

That's it. Edit code under `packages/desktop/src` and the window hot-reloads; edit the
server and it restarts automatically.

## Handy commands (run from `billing/`)

| Command | What it does |
|---|---|
| `pnpm db:up` | Start PostgreSQL (port 5433) |
| `pnpm db:down` | Stop PostgreSQL |
| `pnpm db:status` | Is PostgreSQL running? |
| `pnpm dev` | Run server + desktop together (dev) |
| `pnpm dev:server` | Run only the API (hot reload) |
| `pnpm dev:desktop` | Run only the desktop app (hot reload) |
| `pnpm db:migrate` | Apply schema changes (after editing `schema.prisma`) |
| `pnpm db:seed` | Re-seed sample data |
| `pnpm db:studio` | Open Prisma Studio to browse the database |
| `pnpm test` | Run all unit tests |
| `pnpm build` | Production build of every package |

## First-time data already loaded

The seed created: business profile (Sanskar Palace), an **admin / 1234** user,
room types (Deluxe, Suite), rooms 101/102/201, and a few menu items.
Change the admin PIN and fill in the real business profile under **Settings**.

## Reset the database (start fresh)

```powershell
pnpm --filter @sanskar/server exec prisma migrate reset
```

## Production notes (later)

- For the real 2–5 PC deployment, register PostgreSQL and the API as **Windows services**
  so they auto-start on boot, and use port 5432 on the dedicated server PC.
- Build the installable client with `pnpm --filter @sanskar/desktop dist` (produces a Windows `.exe`).
