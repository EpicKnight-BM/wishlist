-- ============================================================
-- Migration 004: Orphaned wishlists on group member removal
-- Run this in: Supabase Dashboard → SQL Editor → New Query
--
-- Decision (issue #8):
--   When a member leaves or is removed from a group, their
--   wishlist(s) are NOT deleted — only unshared from that group
--   (the wishlist_groups link is dropped). The wishlist stays
--   intact for the owner and stays shared to any other groups
--   it's linked to. Existing claims on that wishlist's items are
--   left untouched — a claim represents a real-world purchase
--   commitment independent of the recipient's group membership.
--
--   gm_delete already permits both self-leave and admin-removal
--   (see 001_initial_schema.sql), so the unlink is implemented as
--   an AFTER DELETE trigger on group_members: it fires no matter
--   which path removes the membership row.
-- ============================================================

-- 1. Trigger: dropping a group_members row unshares that user's
--    wishlists from that group. SECURITY DEFINER so it bypasses
--    RLS on wishlist_groups, same pattern as the other triggers
--    in 001_initial_schema.sql.
create or replace function public.handle_group_member_removed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  delete from public.wishlist_groups wg
  using public.wishlists w
  where wg.wishlist_id = w.id
    and w.user_id = old.user_id
    and wg.group_id = old.group_id;
  return old;
end;
$$;

create trigger on_group_member_removed
  after delete on public.group_members
  for each row execute procedure public.handle_group_member_removed();

-- 2. items_select: once a wishlist is unlinked from a group, a
--    member who already claimed one of its items would otherwise
--    lose visibility into that item (items_select previously
--    required ownership or current group membership). Add a
--    branch so an existing claimant keeps seeing the item they
--    claimed. The secrecy clause below still applies unchanged —
--    claims_insert already forbids owners from claiming their own
--    items, so this can't leak a secret item back to its owner.
drop policy if exists "items_select" on public.items;
create policy "items_select" on public.items for select using (
  (
    (wishlist_id is null and added_by_user_id = auth.uid())
    or (
      wishlist_id is not null
      and (
        public.user_owns_wishlist(wishlist_id, auth.uid())
        or public.wishlist_in_user_group(wishlist_id, auth.uid())
        or exists (
          select 1 from public.claims c
          where c.item_id = items.id and c.claimed_by_user_id = auth.uid()
        )
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
