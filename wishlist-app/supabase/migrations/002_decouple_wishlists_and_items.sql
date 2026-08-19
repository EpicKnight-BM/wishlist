-- ============================================================
-- Migration 002: Decouple Wishlists and Items
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- 1. Drop all RLS policies that reference wishlists.group_id FIRST
--    (cannot drop the column while these exist)
drop policy "wishlists_select" on public.wishlists;
drop policy "wishlists_insert" on public.wishlists;
drop policy "items_select"     on public.items;
drop policy "items_insert"     on public.items;
drop policy "claims_select"    on public.claims;
drop policy "claims_insert"    on public.claims;

-- 2. Create wishlist_groups junction table (wishlists ↔ groups many-to-many)
create table public.wishlist_groups (
  id          uuid primary key default uuid_generate_v4(),
  wishlist_id uuid not null references public.wishlists(id) on delete cascade,
  group_id    uuid not null references public.groups(id) on delete cascade,
  added_by    uuid not null references public.users(id),
  added_at    timestamptz not null default now(),
  unique (wishlist_id, group_id)
);

-- 3. Backfill wishlist_groups from existing wishlists.group_id
insert into public.wishlist_groups (wishlist_id, group_id, added_by)
select id, group_id, user_id from public.wishlists where group_id is not null;

-- 4. Now drop group_id from wishlists (policies are gone, safe to drop)
alter table public.wishlists drop column group_id;

-- 5. Make items.wishlist_id nullable (items can exist unattached)
alter table public.items alter column wishlist_id drop not null;
alter table public.items drop constraint items_wishlist_id_fkey;
alter table public.items add constraint items_wishlist_id_fkey
  foreign key (wishlist_id) references public.wishlists(id) on delete set null;

-- 6. Enable RLS on new table
alter table public.wishlist_groups enable row level security;

-- 7. SECURITY DEFINER helpers to break the RLS circular dependency:
--    wishlists_select ↔ wg_select would recurse if they read each other's tables directly.
create or replace function public.user_owns_wishlist(p_wishlist_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.wishlists where id = p_wishlist_id and user_id = p_user_id
  );
$$;

create or replace function public.wishlist_in_user_group(p_wishlist_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.wishlist_groups wg
    join public.group_members gm on gm.group_id = wg.group_id
    where wg.wishlist_id = p_wishlist_id and gm.user_id = p_user_id
  );
$$;

grant execute on function public.user_owns_wishlist    to anon, authenticated;
grant execute on function public.wishlist_in_user_group to anon, authenticated;

-- 8. Recreate wishlists RLS policies
create policy "wishlists_select" on public.wishlists for select using (
  user_id = auth.uid()
  or public.wishlist_in_user_group(id, auth.uid())
);

create policy "wishlists_insert" on public.wishlists for insert with check (
  user_id = auth.uid()
);

-- 9. wishlist_groups RLS policies (use helpers, no direct table reads)
create policy "wg_select" on public.wishlist_groups for select using (
  public.user_owns_wishlist(wishlist_id, auth.uid())
  or public.is_group_member(group_id)
);

create policy "wg_insert" on public.wishlist_groups for insert with check (
  added_by = auth.uid()
  and public.user_owns_wishlist(wishlist_id, auth.uid())
  and public.is_group_member(group_id)
);

create policy "wg_delete" on public.wishlist_groups for delete using (
  public.user_owns_wishlist(wishlist_id, auth.uid())
);

-- 10. Recreate items RLS policies
create policy "items_select" on public.items for select using (
  (
    (wishlist_id is null and added_by_user_id = auth.uid())
    or (
      wishlist_id is not null
      and (
        public.user_owns_wishlist(wishlist_id, auth.uid())
        or public.wishlist_in_user_group(wishlist_id, auth.uid())
      )
    )
  )
  and (
    is_secret_gift = false
    or (
      is_secret_gift = true
      and (
        wishlist_id is null
        or not public.user_owns_wishlist(wishlist_id, auth.uid())
      )
    )
  )
);

create policy "items_insert" on public.items for insert with check (
  added_by_user_id = auth.uid()
  and (
    wishlist_id is null
    or public.user_owns_wishlist(wishlist_id, auth.uid())
    or public.wishlist_in_user_group(wishlist_id, auth.uid())
  )
);

-- 11. Recreate claims RLS policies
create policy "claims_select" on public.claims for select using (
  claimed_by_user_id = auth.uid()
  or (
    claimed_by_user_id != auth.uid()
    and exists (
      select 1 from public.items i
      where i.id = claims.item_id
        and i.wishlist_id is not null
        and not public.user_owns_wishlist(i.wishlist_id, auth.uid())
        and public.wishlist_in_user_group(i.wishlist_id, auth.uid())
    )
  )
);

create policy "claims_insert" on public.claims for insert with check (
  claimed_by_user_id = auth.uid()
  and not exists (
    select 1 from public.items i
    where i.id = claims.item_id
      and i.wishlist_id is not null
      and public.user_owns_wishlist(i.wishlist_id, auth.uid())
  )
);

-- 11. Grants and indexes for new table
grant all on public.wishlist_groups to anon, authenticated;
create index on public.wishlist_groups (wishlist_id);
create index on public.wishlist_groups (group_id);
