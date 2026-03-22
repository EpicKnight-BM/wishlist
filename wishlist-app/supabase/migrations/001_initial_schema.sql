-- ============================================================
-- Wishlist App — Initial Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS
-- Mirrors Supabase auth.users so we can store extra profile data
-- ============================================================
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null unique,
  name         text not null,
  profile_image text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Auto-create a public.users row whenever someone signs in via Google
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, profile_image)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.email),
    new.raw_user_meta_data->>'avatar_url'
  )
  on conflict (id) do update
    set name          = excluded.name,
        profile_image = excluded.profile_image,
        updated_at    = now();
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert or update on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- GROUPS
-- ============================================================
create table public.groups (
  id          uuid primary key default uuid_generate_v4(),
  name        text not null,
  description text,
  created_by  uuid not null references public.users(id) on delete cascade,
  invite_code text not null unique default substring(md5(random()::text) from 1 for 8),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ============================================================
-- GROUP MEMBERS
-- ============================================================
create type public.group_role as enum ('admin', 'member');

create table public.group_members (
  id        uuid primary key default uuid_generate_v4(),
  user_id   uuid not null references public.users(id) on delete cascade,
  group_id  uuid not null references public.groups(id) on delete cascade,
  role      public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  unique (user_id, group_id)
);

-- Group creator is automatically an admin member
create or replace function public.handle_new_group()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.group_members (user_id, group_id, role)
  values (new.created_by, new.id, 'admin');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute procedure public.handle_new_group();

-- ============================================================
-- WISHLISTS
-- ============================================================
create table public.wishlists (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.users(id) on delete cascade,
  group_id     uuid not null references public.groups(id) on delete cascade,
  title        text not null,
  description  text,
  occasion_date date,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ============================================================
-- ITEMS
-- ============================================================
create table public.items (
  id               uuid primary key default uuid_generate_v4(),
  wishlist_id      uuid not null references public.wishlists(id) on delete cascade,
  added_by_user_id uuid not null references public.users(id) on delete cascade,
  is_secret_gift   boolean not null default false,
  name             text not null,
  description      text,
  price            numeric(10,2),
  url              text,
  image_url        text,
  get_by_date      date,
  get_by_label     text,
  quantity         integer not null default 1 check (quantity >= 1),
  category         text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ============================================================
-- CLAIMS
-- ============================================================
create table public.claims (
  id                uuid primary key default uuid_generate_v4(),
  item_id           uuid not null references public.items(id) on delete cascade,
  claimed_by_user_id uuid not null references public.users(id) on delete cascade,
  quantity_claimed  integer not null default 1 check (quantity_claimed >= 1),
  notes             text,
  is_purchased      boolean not null default false,
  claimed_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (item_id, claimed_by_user_id)
);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Enforces privacy rules at the database level
-- ============================================================

alter table public.users          enable row level security;
alter table public.groups         enable row level security;
alter table public.group_members  enable row level security;
alter table public.wishlists      enable row level security;
alter table public.items          enable row level security;
alter table public.claims         enable row level security;

-- Helper: is the calling user a member of a group?
create or replace function public.is_group_member(p_group_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and user_id = auth.uid()
  );
$$;

-- USERS: everyone can read; only self can update
create policy "users_select" on public.users for select using (true);
create policy "users_update" on public.users for update using (id = auth.uid());

-- GROUPS: members can read; anyone authenticated can create
create policy "groups_select"  on public.groups for select using (public.is_group_member(id));
create policy "groups_insert"  on public.groups for insert with check (created_by = auth.uid());
create policy "groups_update"  on public.groups for update using (created_by = auth.uid());

-- GROUP MEMBERS: members of the group can read the roster; admins can add/remove
create policy "gm_select" on public.group_members for select using (public.is_group_member(group_id));
create policy "gm_insert" on public.group_members for insert with check (
  -- admins can add others; anyone can add themselves (join via invite)
  user_id = auth.uid() or
  exists (select 1 from public.group_members where group_id = group_members.group_id and user_id = auth.uid() and role = 'admin')
);
create policy "gm_delete" on public.group_members for delete using (
  user_id = auth.uid() or
  exists (select 1 from public.group_members gm2 where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid() and gm2.role = 'admin')
);

-- WISHLISTS: group members can read; owner can create/update/delete
create policy "wishlists_select" on public.wishlists for select using (public.is_group_member(group_id));
create policy "wishlists_insert" on public.wishlists for insert with check (
  user_id = auth.uid() and public.is_group_member(group_id)
);
create policy "wishlists_update" on public.wishlists for update using (user_id = auth.uid());
create policy "wishlists_delete" on public.wishlists for delete using (user_id = auth.uid());

-- ITEMS: KEY PRIVACY RULE
-- Secret gift items (is_secret_gift = true) are NEVER returned to the wishlist owner
create policy "items_select" on public.items for select using (
  -- Must be a member of the group the wishlist belongs to
  exists (
    select 1 from public.wishlists w
    join public.group_members gm on gm.group_id = w.group_id
    where w.id = items.wishlist_id and gm.user_id = auth.uid()
  )
  and (
    -- Non-secret items: always visible
    items.is_secret_gift = false
    or
    -- Secret items: only visible to non-owners (gift givers)
    (
      items.is_secret_gift = true
      and not exists (
        select 1 from public.wishlists w2
        where w2.id = items.wishlist_id and w2.user_id = auth.uid()
      )
    )
  )
);

create policy "items_insert" on public.items for insert with check (
  added_by_user_id = auth.uid()
  and exists (
    select 1 from public.wishlists w
    join public.group_members gm on gm.group_id = w.group_id
    where w.id = items.wishlist_id and gm.user_id = auth.uid()
  )
);

create policy "items_update" on public.items for update using (added_by_user_id = auth.uid());
create policy "items_delete" on public.items for delete using (added_by_user_id = auth.uid());

-- CLAIMS: KEY PRIVACY RULE
-- Wishlist owners cannot read claims on their own items
create policy "claims_select" on public.claims for select using (
  -- The claimant can always see their own claim
  claimed_by_user_id = auth.uid()
  or
  -- Other group members can see claims, BUT NOT if they own the wishlist the item belongs to
  (
    claimed_by_user_id != auth.uid()
    and exists (
      select 1 from public.items i
      join public.wishlists w on w.id = i.wishlist_id
      join public.group_members gm on gm.group_id = w.group_id
      where i.id = claims.item_id
        and gm.user_id = auth.uid()
        and w.user_id != auth.uid()   -- <-- owner is blocked here
    )
  )
);

create policy "claims_insert" on public.claims for insert with check (
  claimed_by_user_id = auth.uid()
  -- Cannot claim items on your own wishlist
  and not exists (
    select 1 from public.items i
    join public.wishlists w on w.id = i.wishlist_id
    where i.id = claims.item_id and w.user_id = auth.uid()
  )
);

create policy "claims_update" on public.claims for update using (claimed_by_user_id = auth.uid());
create policy "claims_delete" on public.claims for delete using (claimed_by_user_id = auth.uid());

-- Function: check if an item is claimed (for the delete-warning; returns boolean to the OWNER)
-- Owner calls this; it bypasses RLS because it's security definer
create or replace function public.item_has_claims(p_item_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.claims where item_id = p_item_id);
$$;

-- ============================================================
-- USEFUL INDEXES
-- ============================================================
create index on public.group_members (user_id);
create index on public.group_members (group_id);
create index on public.wishlists (user_id);
create index on public.wishlists (group_id);
create index on public.items (wishlist_id);
create index on public.items (added_by_user_id);
create index on public.claims (item_id);
create index on public.claims (claimed_by_user_id);
create unique index on public.groups (invite_code);
