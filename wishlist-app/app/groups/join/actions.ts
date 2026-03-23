"use server";

import { createServerClient } from "@supabase/ssr";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "@/lib/types";

export async function joinGroup(inviteCode: string): Promise<{ groupId: string }> {
  // Verify the user
  const cookieStore = await cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll(), setAll: () => {} } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Use service role to look up the group (bypasses RLS — non-members can't read groups)
  const admin = createAdminClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: group } = await admin
    .from("groups")
    .select("id")
    .eq("invite_code", inviteCode.trim().toLowerCase())
    .maybeSingle();

  if (!group) throw new Error("Invalid invite code. Please check and try again.");

  // Check if already a member
  const { data: existing } = await admin
    .from("group_members")
    .select("id")
    .eq("group_id", group.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return { groupId: group.id };

  // Join the group
  const { error: joinError } = await admin
    .from("group_members")
    .insert({ user_id: user.id, group_id: group.id, role: "member" });

  if (joinError) throw new Error(joinError.message);

  return { groupId: group.id };
}
