# Cloudflare Deployment

This project is configured for Cloudflare Pages plus one Cloudflare Worker cron.

## Cloudflare Pages

Create a Pages project from the GitHub repo.

- Framework preset: Vite
- Build command: `npm run build`
- Build output directory: `dist`
- Functions directory: `functions`

Add these Pages environment variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`
- Optional: `SHEIN_SEARCH_API_KEY` or `SEARCHAPI_API_KEY`

Shein blocks normal server-side metadata reads with a challenge page. If Shein image import is required, add a server-only SearchApi key to Cloudflare Pages as `SHEIN_SEARCH_API_KEY`. Without it, the importer falls back to title/store only and asks the admin to paste the image URL manually.

The product importer runs at:

- `/api/extract-product?url=https://example.com/product`

## Keep-Alive Worker

The Supabase keep-alive is a separate Cloudflare Worker because scheduled jobs use Workers Cron Triggers.

From the repo root:

```sh
npx wrangler deploy --config workers/keep-supabase-alive/wrangler.toml
```

Set these Worker secrets/vars:

```sh
npx wrangler secret put SUPABASE_SERVICE_ROLE_KEY --config workers/keep-supabase-alive/wrangler.toml
npx wrangler secret put SUPABASE_URL --config workers/keep-supabase-alive/wrangler.toml
```

`SUPABASE_URL` should be the same value as `VITE_SUPABASE_URL`.

The cron runs daily at `14:34 UTC`.

## Cloudflare Redirects

The `_redirects` file keeps client-side routes working:

- `/admin`
- `/store/:slug`
- all other React routes
