-- ============================================================
-- Migration 003: Fix infinite recursion in RLS policies
--
-- Root cause:
--   wishlists_select reads wishlist_groups (triggers wg_select)
--   wg_select reads wishlists (triggers wishlists_select)
--   → infinite loop
--
-- Fix: SECURITY DEFINER helper functions bypass RLS on the
--      tables they query, breaking the cycle.
-- ============================================================

-- Drop all affected policies first
drop policy if exists "wishlists_select" on public.wishlists;
drop policy if exists "wg_select"        on public.wishlist_groups;
drop policy if exists "wg_insert"        on public.wishlist_groups;
drop policy if exists "wg_delete"        on public.wishlist_groups;
drop policy if exists "items_select"     on public.items;
drop policy if exists "items_insert"     on public.items;
drop policy if exists "claims_select"    on public.claims;
drop policy if exists "claims_insert"    on public.claims;

-- Helper: does p_user_id own the given wishlist?
-- SECURITY DEFINER = runs as the function owner, bypassing RLS on wishlists
create or replace function public.user_owns_wishlist(p_wishlist_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.wishlists
    where id = p_wishlist_id and user_id = p_user_id
  );
$$;

-- Helper: is the wishlist in any group that p_user_id belongs to?
-- SECURITY DEFINER = bypasses RLS on wishlist_groups and group_members
create or replace function public.wishlist_in_user_group(p_wishlist_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.wishlist_groups wg
    join public.group_members gm on gm.group_id = wg.group_id
    where wg.wishlist_id = p_wishlist_id and gm.user_id = p_user_id
  );
$$;

-- wishlists: uses the helper so it never reads wishlist_groups via RLS
create policy "wishlists_select" on public.wishlists for select using (
  user_id = auth.uid()
  or public.wishlist_in_user_group(id, auth.uid())
);

-- wishlist_groups: uses the ownership helper so it never reads wishlists via RLS
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

-- items: uses helpers for all wishlist-related checks
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

-- claims: uses helpers instead of JOINing through wishlists/wishlist_groups via RLS
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

-- Grants
grant execute on function public.user_owns_wishlist    to anon, authenticated;
grant execute on function public.wishlist_in_user_group to anon, authenticated;
