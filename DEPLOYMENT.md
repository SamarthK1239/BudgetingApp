# Self-Hosted Deployment

BudgetingApp can run as a always-on server that publishes a web UI to every
device on your tailnet. The FastAPI backend serves both the REST API and the
built React app from a single port, protected by username/password
authentication.

```
┌─────────────────────────────┐          ┌──────────────────────────┐
│  AI server (Docker host)    │          │  Phone / laptop / tablet │
│                             │          │                          │
│  budgetingapp container     │◀────────▶│  Browser on the tailnet  │
│   • FastAPI API  (/api/*)   │ Tailscale│  or Electron desktop app │
│   • React web UI (/)        │          │                          │
│   • SQLite on /data volume  │          │                          │
└─────────────────────────────┘          └──────────────────────────┘
```

---

## 1. Deploy with Docker Compose

From a checkout of this repository on the server:

```bash
cp .env.example .env     # optional, for customising settings
docker compose up -d --build
```

That is all that is required. On first start the container will:

1. create `/data/budget.db` on a named Docker volume,
2. apply all Alembic migrations,
3. generate and persist a signing key at `/data/.secret_key`,
4. serve the web UI on port `8000`.

Check that it came up:

```bash
docker compose ps          # STATUS should show "healthy"
docker compose logs -f     # follow startup output
curl http://localhost:8000/health
```

### Updating

```bash
git pull
docker compose up -d --build
```

Your data lives on the `budgetapp-data` volume and is untouched by rebuilds.

### Backups

The entire application state is the `/data` directory:

```bash
docker compose stop
docker run --rm -v budgetapp-data:/data -v "$PWD:/backup" alpine \
    tar czf /backup/budgetapp-backup.tar.gz -C /data .
docker compose start
```

---

## 2. First run: create your account

Open `http://<server>:8000` in a browser. Because the server has no accounts
yet, it shows a **Create your administrator account** screen. The first account
you create becomes an administrator and can add more users afterwards.

Once the admin exists, that screen is permanently replaced by the sign-in page.

### If you get locked out

Reset a password directly on the server:

```bash
docker compose exec budgetapp python -m app.cli reset-password --username samarth
```

Other CLI commands:

```bash
docker compose exec budgetapp python -m app.cli list-users
docker compose exec budgetapp python -m app.cli create-user --username partner
docker compose exec budgetapp python -m app.cli set-admin --username partner
docker compose exec budgetapp python -m app.cli set-admin --username partner --revoke
```

Passwords are prompted for interactively when `--password` is omitted.

---

## 3. Expose it over Tailscale

Tailscale gives you device-level access control and transport encryption, so
the app itself does not need to terminate TLS.

### Option A — Plain HTTP on the tailnet (simplest)

Publish the container only on the Tailscale interface by setting the host
address in `.env`:

```bash
BUDGET_PUBLISH_ADDR=100.x.y.z    # your server's Tailscale IP
```

Then reach it at `http://100.x.y.z:8000` from any tailnet device. Nothing on
your LAN or the public internet can connect.

### Option B — HTTPS with `tailscale serve` (recommended)

`tailscale serve` puts a TLS-terminating proxy in front of the app and issues a
certificate for your MagicDNS name automatically:

```bash
sudo tailscale serve --bg 8000
sudo tailscale serve status
```

The app is then available at `https://<hostname>.<tailnet>.ts.net` with a valid
certificate and no port number.

**Important:** when serving over HTTPS, set the following in `.env` and restart,
so the session cookie is marked `Secure`:

```bash
BUDGET_SECURE_COOKIES=true
```

```bash
docker compose up -d
```

> Do **not** use `tailscale funnel` unless you genuinely intend to publish your
> financial data to the public internet.

---

## 4. Using the desktop (Electron) app against the server

The Electron app still works and can now point at your self-hosted server
instead of spawning its own local backend.

- On the sign-in screen, click **Server settings** and enter the server URL,
  for example `http://100.x.y.z:8000` or `https://budget.tailnet.ts.net`.
- The URL is saved under the Electron `userData` directory and reused on every
  launch. Whenever a remote URL is configured, the app does **not** start a
  local backend.
- You can also set it without the UI:

  ```bash
  BUDGETAPP_SERVER_URL=https://budget.tailnet.ts.net npm run electron
  ```

  The environment variable takes precedence over the saved setting.

To go back to a fully local desktop install, delete the `backendUrl` key from
`config.json` in the Electron `userData` directory.

---

## 5. Authentication model

| Aspect | Behaviour |
| --- | --- |
| Credentials | Username + password; passwords hashed with bcrypt |
| Sessions | Opaque random tokens stored **hashed** in the `user_sessions` table |
| Browser transport | `HttpOnly`, `SameSite=Lax` cookie, same origin as the UI |
| Desktop transport | `Authorization: Bearer <token>` header |
| Lifetime | 30 days by default, extended automatically while in use |
| Revocation | Logout, password change, account disable, or admin deletion |
| Brute force | Failed logins throttled per IP + username |
| Roles | Administrators manage users; members use the app normally |
| Data scope | **All users share the same budget data** |

Because sessions are stored server-side, signing out or changing a password
immediately invalidates the relevant tokens — there is no window where an old
token keeps working.

Unauthenticated requests to any `/api/*` route (other than the auth endpoints
and `/health`) receive `401 Unauthorized`.

### Managing users from the web UI

Sign in as an administrator and open **Users** in the sidebar to add accounts,
grant or revoke administrator rights, disable accounts, or reset passwords.
Every user can change their own password from the same page.

---

## 6. Configuration reference

All settings are environment variables prefixed with `BUDGET_`. See
[`.env.example`](./.env.example) for the annotated list.

| Variable | Default | Purpose |
| --- | --- | --- |
| `BUDGET_HOST` | `0.0.0.0` | Bind address inside the container |
| `BUDGET_PORT` | `8000` | Listen port |
| `BUDGET_PUBLISH_ADDR` | `0.0.0.0` | Host interface the container is published on |
| `BUDGET_PUBLISH_PORT` | `8000` | Host port the container is published on |
| `BUDGET_DATA_DIR` | `/data` | Directory for the database and signing key |
| `BUDGET_DATABASE_PATH` | _(unset)_ | Explicit database file path |
| `BUDGET_SECRET_KEY` | _(generated)_ | Signs session tokens; persisted if unset |
| `BUDGET_SESSION_LIFETIME_DAYS` | `30` | Session lifetime (sliding) |
| `BUDGET_SECURE_COOKIES` | `false` | Mark the session cookie `Secure` (set `true` for HTTPS) |
| `BUDGET_LOGIN_MAX_ATTEMPTS` | `10` | Failed logins before throttling |
| `BUDGET_LOGIN_LOCKOUT_SECONDS` | `300` | Throttle duration |
| `BUDGET_SERVE_FRONTEND` | `true` | Serve the bundled web UI |
| `BUDGET_FRONTEND_DIR` | _(auto)_ | Override the web UI directory |
| `BUDGET_CORS_ORIGINS` | dev + `file://` | Extra browser origins allowed to call the API |

> `BUDGET_CORS_ORIGINS` accepts a comma-separated list (set it to an empty
> value to disable cross-origin requests entirely). The web UI is served
> from the same origin as the API, so you normally do not need to change it.

---

## 7. Running without Docker

If you prefer to run it directly on the host:

```bash
cd frontend && npm install --legacy-peer-deps && npm run build
cd ../backend && python -m venv .venv && .venv/bin/pip install -r requirements.txt

export BUDGET_DATA_DIR="$HOME/.local/share/budgetingapp"
export BUDGET_HOST=100.x.y.z       # bind the tailnet address directly
.venv/bin/python -m uvicorn app.main:app --host "$BUDGET_HOST" --port 8000
```

The server automatically picks up `frontend/build`, so the web UI is available
on the same port.

A minimal systemd unit:

```ini
[Unit]
Description=BudgetingApp server
After=network-online.target tailscaled.service

[Service]
Type=simple
User=samarth
WorkingDirectory=/home/samarth/BudgetingApp/backend
Environment=BUDGET_DATA_DIR=/home/samarth/.local/share/budgetingapp
Environment=BUDGET_HOST=0.0.0.0
ExecStart=/home/samarth/BudgetingApp/backend/.venv/bin/python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

---

## 8. Troubleshooting

**The web UI loads but every request fails with 401 after signing in.**
You are probably on HTTPS with `BUDGET_SECURE_COOKIES=false`, or on HTTP with it
set to `true`. The setting must match how you actually reach the server.

**"No frontend build found; running in API-only mode" in the logs.**
The React build is missing. In Docker this should never happen; outside Docker,
run `npm run build` in `frontend/` or set `BUDGET_FRONTEND_DIR`.

**Another device on the tailnet cannot connect.**
Check `BUDGET_PUBLISH_ADDR` is not restricted to `127.0.0.1`, confirm
`tailscale status` lists both devices, and verify any host firewall allows the
port.

**I forgot the admin password.**
Use `docker compose exec budgetapp python -m app.cli reset-password --username <name>`.

**Everyone was signed out unexpectedly.**
The signing key changed. This happens if `BUDGET_SECRET_KEY` was set, changed,
then unset, or if the `/data` volume was recreated. Signing in again is enough.
