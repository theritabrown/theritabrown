# Rita Brown Link-in-Bio Storefront

A mobile-first personal website for Rita Brown with Linktree-style links, a storefront page for products from any shop, Supabase-backed content, and a Netlify Function that imports product metadata from pasted URLs.

## Feature Brainstorm

- Public creator page with profile, social links, featured links, and smooth entrance motion.
- Storefront-style collection page for non-Amazon links, including product cards, categories, prices, store names, and "Rita pick" badges.
- Admin route at `/admin` for adding bio links and product cards.
- Product URL importer powered by `/.netlify/functions/extract-product`, reading JSON-LD and OpenGraph metadata when stores expose it.
- Supabase tables and row-level security for profiles, links, collections, and products.
- Demo data fallback so the site works before `.env` is available.
- Netlify routing for `/admin` and `/store/:slug` paths.

## Local Development

```bash
npm install
npm run dev
```

For the product importer locally, use Netlify Dev:

```bash
npx netlify dev
```

## Environment

Copy `.env.example` to `.env` and fill in:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

The app uses demo data until those values exist.

## Supabase Setup

Run `supabase/schema.sql` in the Supabase SQL editor. Then create an authenticated admin user in Supabase Auth. Any authenticated user can manage content under the starter RLS policies, which keeps the first client handoff simple. Tighten these policies before inviting more admins.

## Deploy

This project is ready for Netlify:

- Build command: `npm run build`
- Publish directory: `dist`
- Functions directory: `netlify/functions`

Add the same environment variables in Netlify before deploying.
