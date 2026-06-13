# Blinkr

Fast, modern text messaging — web, desktop, and PWA. Built for teenagers and young adults who want clean chat without the noise.

**Messages that move at the speed of now.**

## Platforms

| Platform | How |
|----------|-----|
| **Web** | Any browser — `apps/web` |
| **Chromebook** | Install as PWA from the web app |
| **Windows / macOS** | Native desktop via Tauri — `apps/desktop` |

## Stack

| Layer | Tech |
|-------|------|
| Frontend | Vue 3, TypeScript, Pinia, Vue Router |
| Styling | Tailwind CSS v4 |
| Desktop | Tauri 2 (Rust) |
| Backend | Cloudflare Workers |
| Database | Cloudflare D1 (SQLite) |
| Real-time | Durable Objects + WebSockets |
| Media | Backblaze B2 (avatars & chat images; D1 fallback for local dev) |
| Push | Web Push (PWA) + Tauri notifications (desktop) |

## Features

- User accounts with usernames, profile pictures, and friend requests
- Real-time messaging with typing indicators and read receipts
- Group chats with custom names and icons
- Message reactions, replies, edits, and deletes
- Photo sharing from gallery or camera
- Dark / light / system theme
- Push notifications (PWA + desktop)
- Smooth animations and premium UI

## Project structure

```
blinkr/
├── apps/
│   ├── web/          # Vue web app + PWA
│   └── desktop/      # Tauri desktop shell
├── packages/
│   └── shared/       # Shared TypeScript types
└── workers/
    └── api/          # Cloudflare Workers API
```

## Getting started

### Prerequisites

- Node.js 20+
- Rust (for desktop builds) — [rustup.rs](https://rustup.rs)
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/) (for API)

### Install

```bash
npm install
```

### Web app

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). Use **Try demo** on the login screen to explore the UI without a backend.

### API (Cloudflare Workers)

```bash
cp workers/api/.dev.vars.example workers/api/.dev.vars
cd workers/api
npx wrangler d1 migrations apply blinkr-db --local
npm run dev
```

The web app proxies `/api` to `localhost:8787` in development.

### Desktop app

```bash
npm run dev:desktop
```

Builds for Windows (.msi), macOS (.dmg), and Linux.

### macOS install

Release builds are ad-hoc signed (no Apple notarization). After installing from the DMG:

1. Drag **Blinkr** to Applications
2. First launch: right-click the app → **Open** → **Open**
3. If macOS says the app is damaged: `xattr -cr /Applications/Blinkr.app`

For a fully trusted install, the app needs Apple Developer ID signing and notarization in CI.

## Deployment

Blinkr ships as a single Cloudflare Worker (API + static site). Pushes to `main` deploy automatically once GitHub secrets are configured.

### One-time GitHub setup

```powershell
.\scripts\setup-github-infra.ps1
gh secret set CLOUDFLARE_API_TOKEN   # Workers + D1 edit permissions
```

| GitHub config | Value |
|---|---|
| Variable `BLINKR_PUBLIC_URL` | `https://blinkr.sortedsh.workers.dev` (or your custom domain) |
| Secret `CLOUDFLARE_ACCOUNT_ID` | Set by setup script |
| Secret `CLOUDFLARE_API_TOKEN` | Cloudflare API token (you create this) |

Worker secrets (set once via Wrangler, not GitHub):

```bash
cd workers/api
npx wrangler secret put JWT_SECRET
npx wrangler secret put B2_APPLICATION_KEY_ID
npx wrangler secret put B2_APPLICATION_KEY
```

### Manual deploy

```powershell
.\scripts\deploy.ps1
# or
npm run deploy:migrate && npm run deploy
```

### Custom domain

1. Add the domain to Cloudflare and uncomment `[[routes]]` in `workers/api/wrangler.toml`.
2. Update `BLINKR_PUBLIC_URL` in GitHub (or pass `-PublicUrl` to `deploy.ps1`).
3. Push to `main` or run deploy manually.

### CI

- **CI** (`.github/workflows/ci.yml`) — lint, build, Worker dry-run on PRs and `main`.
- **Deploy** (`.github/workflows/deploy.yml`) — migrations + Worker deploy on push to `main`.
- **Release** (`.github/workflows/release.yml`) — desktop + PWA builds on version tags (`v*`).

## Brand

- **Colors:** Violet (`#7c3aed`) → Cyan (`#06b6d4`) gradient
- **Fonts:** Outfit (display), Inter (body)
- **Tone:** Modern, confident, catchy

## License

MIT
