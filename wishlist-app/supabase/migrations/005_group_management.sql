-- ============================================================
-- Migration 005: Group management — delete group, promote/demote,
-- last-admin guard (issue #8)
-- Run this in: Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- Helper: does this group have an admin other than the given
-- group_members row? Used to block leaving/removing/demoting the
-- last remaining admin.
create or replace function public.group_has_other_admin(p_group_id uuid, p_member_id uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members
    where group_id = p_group_id and role = 'admin' and id <> p_member_id
  );
$$;

grant execute on function public.group_has_other_admin to anon, authenticated;

-- 1. gm_delete: block removing (leaving or being removed as) the
--    last admin. Promoting a replacement, or deleting the whole
--    group (see delete_group below), are the ways out.
drop policy if exists "gm_delete" on public.group_members;
create policy "gm_delete" on public.group_members for delete using (
  (
    user_id = auth.uid()
    or exists (
      select 1 from public.group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'admin'
    )
  )
  and (
    role <> 'admin'
    or public.group_has_other_admin(group_id, id)
  )
);

-- 2. gm_update: admins can change a member's role; demoting the
--    last admin is blocked the same way.
create policy "gm_update" on public.group_members for update using (
  exists (
    select 1 from public.group_members gm2
    where gm2.group_id = group_members.group_id
      and gm2.user_id = auth.uid()
      and gm2.role = 'admin'
  )
) with check (
  role = 'admin'
  or public.group_has_other_admin(group_id, id)
);

-- 3. Delete group — creator only. Deliberately NOT a groups_delete
--    RLS policy: a plain policy-gated delete would run the
--    on-delete-cascade to group_members under the caller's own
--    session, which the last-admin guard above would then block
--    for the common case of a solo creator/admin deleting their
--    own group. Routing through a SECURITY DEFINER function keeps
--    the last-admin guard meaningful for everyday leave/remove
--    while letting a full group deletion bypass it, since the
--    guard's purpose (a group always has a manager) doesn't apply
--    once the group itself is gone.
create or replace function public.delete_group(p_group_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (
    select 1 from public.groups where id = p_group_id and created_by = auth.uid()
  ) then
    raise exception 'Only the group creator can delete this group';
  end if;

  delete from public.groups where id = p_group_id;
end;
$$;

grant execute on function public.delete_group to authenticated;
