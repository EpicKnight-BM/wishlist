-- ============================================================
-- Migration 006: Parent-managed profiles for children without
-- accounts (issue #7)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Model chosen (see issue #7 discussion): a "placeholder" row in
-- public.users with no matching auth.users account, linked back
-- to its manager via managed_by_user_id. This keeps every other
-- table (group_members, wishlists, items, claims) unchanged in
-- shape, since they already just reference public.users(id).
--
-- Decisions:
--   - One manager per managed profile (no join table needed).
--   - The manager is NOT blinded from secret items on a wishlist
--     they manage — the secrecy branch of items_select compares
--     auth.uid() to the wishlist owner's literal id, and a
--     manager's own id is never equal to their managed profile's
--     id, so that part falls out of the existing logic unchanged.
--     The *visibility* branch of items_select, plus items_insert
--     and claims_insert, do need updating to can_manage_wishlist
--     below — otherwise a manager can't see or add items on a
--     managed profile's not-yet-shared wishlist at all.
--   - Managed profiles can never hold the 'admin' group role —
--     they can't consent to or act on anything themselves.
--
-- Also folded in here: items_select and claims_select each had a
-- raw subquery reaching into the other's table without the
-- SECURITY DEFINER wrapper used everywhere else in this file,
-- creating a real circular RLS reference — Postgres would error
-- with "infinite recursion detected in policy for relation items"
-- (42P17), which the app silently swallowed as an empty item list.
-- Fixed the same way 003_fix_rls_recursion.sql already fixed this
-- once, for a different pair of tables.
-- ============================================================

-- 1. Let a users row exist without a backing auth.users account.
alter table public.users drop constraint if exists users_id_fkey;
alter table public.users alter column id set default uuid_generate_v4();

-- 2. Managed profiles have no email of their own.
alter table public.users alter column email drop not null;

-- 3. The management link.
alter table public.users add column managed_by_user_id uuid references public.users(id) on delete cascade;
alter table public.users add constraint users_managed_by_not_self check (managed_by_user_id is null or managed_by_user_id <> id);
create index idx_users_managed_by on public.users(managed_by_user_id) where managed_by_user_id is not null;

-- ============================================================
-- Helpers
-- ============================================================

-- Can p_acting_user_id act as p_target_user_id (themselves, or a
-- profile they manage)? Used everywhere a table checks
-- "user_id = auth.uid()" for ownership/edit rights.
create or replace function public.can_act_as(p_target_user_id uuid, p_acting_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select p_target_user_id = p_acting_user_id or exists (
    select 1 from public.users
    where id = p_target_user_id and managed_by_user_id = p_acting_user_id
  );
$$;

grant execute on function public.can_act_as to anon, authenticated;

-- Can p_acting_user_id manage (share/unshare) the given wishlist?
-- Deliberately separate from user_owns_wishlist (003_fix_rls_recursion.sql),
-- which is used for the secrecy "hide from the owner" checks — those
-- must keep comparing against the wishlist's literal owner id so a
-- manager stays able to see secret items on a wishlist they manage.
create or replace function public.can_manage_wishlist(p_wishlist_id uuid, p_acting_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.wishlists w
    where w.id = p_wishlist_id and public.can_act_as(w.user_id, p_acting_user_id)
  );
$$;

grant execute on function public.can_manage_wishlist to anon, authenticated;

-- Helper: does p_user_id hold a claim on p_item_id? SECURITY
-- DEFINER so items_select can check claims without triggering
-- claims' own RLS (which would otherwise recurse back into items).
create or replace function public.item_claimed_by(p_item_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.claims
    where item_id = p_item_id and claimed_by_user_id = p_user_id
  );
$$;

grant execute on function public.item_claimed_by to anon, authenticated;

-- Helper: is p_item_id on a wishlist p_user_id doesn't own/manage
-- but can see via group membership? SECURITY DEFINER so
-- claims_select can check items without triggering items' own RLS.
create or replace function public.item_visible_via_group(p_item_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.wishlist_id is not null
      and not public.can_manage_wishlist(i.wishlist_id, p_user_id)
      and public.wishlist_in_user_group(i.wishlist_id, p_user_id)
  );
$$;

grant execute on function public.item_visible_via_group to anon, authenticated;

-- Helper: does p_user_id own or manage the wishlist p_item_id is
-- on? SECURITY DEFINER so claims_insert can check items without
-- triggering items' own RLS.
create or replace function public.item_owned_or_managed_by(p_item_id uuid, p_user_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.items i
    where i.id = p_item_id
      and i.wishlist_id is not null
      and public.can_manage_wishlist(i.wishlist_id, p_user_id)
  );
$$;

grant execute on function public.item_owned_or_managed_by to anon, authenticated;

-- ============================================================
-- users
-- ============================================================

drop policy if exists "users_update" on public.users;
create policy "users_update" on public.users for update using (public.can_act_as(id, auth.uid()));

-- A managed profile can only ever be created by its manager.
create policy "users_insert" on public.users for insert with check (managed_by_user_id = auth.uid());

-- ============================================================
-- wishlists
-- ============================================================

drop policy if exists "wishlists_select" on public.wishlists;
create policy "wishlists_select" on public.wishlists for select using (
  public.can_act_as(user_id, auth.uid())
  or public.wishlist_in_user_group(id, auth.uid())
);

drop policy if exists "wishlists_insert" on public.wishlists;
create policy "wishlists_insert" on public.wishlists for insert with check (public.can_act_as(user_id, auth.uid()));

drop policy if exists "wishlists_update" on public.wishlists;
create policy "wishlists_update" on public.wishlists for update using (public.can_act_as(user_id, auth.uid()));

drop policy if exists "wishlists_delete" on public.wishlists;
create policy "wishlists_delete" on public.wishlists for delete using (public.can_act_as(user_id, auth.uid()));

-- ============================================================
-- wishlist_groups — sharing a managed profile's wishlist into a
-- group the manager belongs to
-- ============================================================

drop policy if exists "wg_insert" on public.wishlist_groups;
create policy "wg_insert" on public.wishlist_groups for insert with check (
  added_by = auth.uid()
  and public.can_manage_wishlist(wishlist_id, auth.uid())
  and public.is_group_member(group_id)
);

drop policy if exists "wg_delete" on public.wishlist_groups;
create policy "wg_delete" on public.wishlist_groups for delete using (
  public.can_manage_wishlist(wishlist_id, auth.uid())
);

-- ============================================================
-- group_members — a manager can add/remove their own managed
-- profile without being a group admin; the target group_id must
-- be one the manager already belongs to (unlike self-join, which
-- relies on an unguessable invite code as its authorization gate)
-- ============================================================

drop policy if exists "gm_insert" on public.group_members;
create policy "gm_insert" on public.group_members for insert with check (
  user_id = auth.uid()
  or (
    exists (
      select 1 from public.users
      where id = group_members.user_id and managed_by_user_id = auth.uid()
    )
    and public.is_group_member(group_id)
  )
  or exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid() and gm2.role = 'admin'
  )
);

drop policy if exists "gm_delete" on public.group_members;
create policy "gm_delete" on public.group_members for delete using (
  (
    user_id = auth.uid()
    or exists (
      select 1 from public.users
      where id = group_members.user_id and managed_by_user_id = auth.uid()
    )
    or exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id and gm2.user_id = auth.uid() and gm2.role = 'admin'
    )
  )
  and (
    role <> 'admin'
    or public.group_has_other_admin(group_id, id)
  )
);

-- gm_update (005_group_management.sql): also block promoting a
-- managed profile to admin — they can never act on the role
-- themselves, so they could get permanently stuck as an
-- unreachable "last admin".
drop policy if exists "gm_update" on public.group_members;
create policy "gm_update" on public.group_members for update using (
  exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id
      and gm2.user_id = auth.uid()
      and gm2.role = 'admin'
  )
) with check (
  (
    role <> 'admin'
    or not exists (
      select 1 from public.users u where u.id = group_members.user_id and u.managed_by_user_id is not null
    )
  )
  and (
    role = 'admin'
    or public.group_has_other_admin(group_id, id)
  )
);

-- ============================================================
-- items / claims — let a manager act on a managed profile's
-- wishlist, and fix the items/claims RLS recursion (see header)
-- ============================================================

drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items for select using (
  (
    (wishlist_id is null and added_by_user_id = auth.uid())
    or (
      wishlist_id is not null
      and (
        public.can_manage_wishlist(wishlist_id, auth.uid())
        or public.wishlist_in_user_group(wishlist_id, auth.uid())
        or public.item_claimed_by(id, auth.uid())
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

drop policy if exists "items_insert" on public.items;
create policy "items_insert" on public.items for insert with check (
  added_by_user_id = auth.uid()
  and (
    wishlist_id is null
    or public.can_manage_wishlist(wishlist_id, auth.uid())
    or public.wishlist_in_user_group(wishlist_id, auth.uid())
  )
);

drop policy if exists "claims_select" on public.claims;
create policy "claims_select" on public.claims for select using (
  claimed_by_user_id = auth.uid()
  or (
    claimed_by_user_id != auth.uid()
    and public.item_visible_via_group(item_id, auth.uid())
  )
);

drop policy if exists "claims_insert" on public.claims;
create policy "claims_insert" on public.claims for insert with check (
  claimed_by_user_id = auth.uid()
  and not public.item_owned_or_managed_by(item_id, auth.uid())
);
