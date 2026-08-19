# Wishlist

Group gift-list app where wishlist owners never see who claimed what — so surprises stay surprises, and gift-givers can still coordinate to avoid duplicate gifts.

## How it works

- **Groups** — permanent groups (family, friends, coworkers) for recurring occasions, joined via invite code
- **Wishlists** — owned by one user, shared with any number of groups
- **Items** — added to a wishlist, or kept unattached in a personal item pool until assigned
- **Claims** — group members claim items to signal "I've got this"; the wishlist owner never sees claim status, only a warning if they try to delete a claimed item
- **Secret gift items** — items other members add for someone, hidden from that person entirely

## Tech stack

- [Next.js](https://nextjs.org/) (App Router, Turbopack) + TypeScript
- [Supabase](https://supabase.com/) — Postgres, Auth (Google OAuth), Row Level Security
- Tailwind CSS

## Getting started

### 1. Install dependencies

```bash
cd wishlist-app
npm install
```

### 2. Set up Supabase

Create a project at [supabase.com](https://supabase.com), then run the migrations in `wishlist-app/supabase/migrations/` against it, in order (via the SQL editor or the Supabase CLI).

Enable Google as an OAuth provider under **Authentication → Providers**.

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` from your Supabase project's **Settings → API**.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project structure

```
wishlist-app/
  app/              # routes (App Router)
    dashboard/       groups/         items/         wishlists/
  components/       # UI components, grouped by feature
  lib/
    supabase/         browser/server Supabase clients
    types.ts           Database types
  supabase/
    migrations/       SQL migrations, applied in order
```

## Data model

- A wishlist can belong to multiple groups via the `wishlist_groups` join table.
- Items can be unattached (`wishlist_id IS NULL`) — a user's personal pool before assigning them to a wishlist.
- Claims are global to a wishlist, not per-group: if a wishlist is shared with several groups, members of any of them see the same claim state.
- Visibility and claim-hiding rules are enforced at the database level via Postgres RLS policies (see the migrations).
