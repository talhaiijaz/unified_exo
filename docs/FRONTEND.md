# Frontend Guide

**Path:** `nanotech_website/`  
**Stack:** Next.js 15, React, Tailwind, pnpm

## Add a new page

1. Create a file under `nanotech_website/app/`:
   - Public page: `app/my-page/page.tsx`
   - Dashboard: `app/portal/my-feature/page.tsx`
2. Add navigation links in the relevant layout or nav component
3. Test locally:

```bash
cd nanotech_website
pnpm dev
# Open http://localhost:3000
```

## API calls from the frontend

The app proxies backend requests via Next.js rewrites:

- Browser calls: `/api/exo/...`
- Proxied to: `http://localhost:5000/api/...`

See `nanotech_website/next.config.ts` for rewrite rules.

## Production build

```bash
cd nanotech_website
pnpm install
pnpm build
pnpm start -p 8080 -H 0.0.0.0
```

On the server, `exo-frontend.service` runs this on port **8080**.

## Environment

Copy `nanotech_website/.env.example` for local dev. Production uses systemd env — see `deploy/frontend.env.example`.

## Submitting changes

1. Fork `jadoo-tech/unified_server`
2. Branch: `feature/my-page-name`
3. Open PR — include screenshot if UI changed
4. After merge, deployer runs `./scripts/deploy.sh` on server
