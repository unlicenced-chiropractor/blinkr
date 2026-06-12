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
| Media | Cloudflare R2 |
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

## Deployment

### Web → Cloudflare Pages

```bash
npm run build
npx wrangler pages deploy apps/web/dist --project-name blinkr
```

Set environment variables: `VITE_API_URL`, `VITE_WS_URL`

### API → Cloudflare Workers

```bash
cd workers/api
npx wrangler d1 create blinkr-db          # update wrangler.toml with database_id
npx wrangler r2 bucket create blinkr-images
npx wrangler secret put JWT_SECRET
npm run db:migrate:remote
npm run deploy
```

## Brand

- **Colors:** Violet (`#7c3aed`) → Cyan (`#06b6d4`) gradient
- **Fonts:** Outfit (display), Inter (body)
- **Tone:** Modern, confident, catchy

## License

MIT
