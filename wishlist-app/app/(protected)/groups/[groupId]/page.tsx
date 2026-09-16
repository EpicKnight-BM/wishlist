import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { User } from "@/lib/types";
import InviteByEmailButton from "./InviteByEmailButton";
import AddManagedProfileButton from "./AddManagedProfileButton";
import DeleteGroupButton from "./DeleteGroupButton";
import MemberList from "@/components/groups/MemberList";

interface Props {
  params: Promise<{ groupId: string }>;
}

export default async function GroupPage({ params }: Props) {
  const { groupId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify membership and fetch group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role, groups(id, name, description, invite_code, created_by)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const group = membership.groups as unknown as {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
    created_by: string;
  };

  // Fetch all members
  const { data: members } = await supabase
    .from("group_members")
    .select("role, users(id, name, profile_image, managed_by_user_id)")
    .eq("group_id", groupId);

  const memberIds = new Set(
    (members ?? []).map((m) => (m.users as unknown as { id: string }).id)
  );

  // Profiles this user already manages elsewhere, so "Add a profile" can
  // reuse one instead of always minting a new managed profile — otherwise
  // the same child would end up as a separate entity in every group.
  const { data: managedProfiles } = await supabase
    .from("users")
    .select("id, name")
    .eq("managed_by_user_id", user.id);

  const availableManagedProfiles = (managedProfiles ?? []).filter((p) => !memberIds.has(p.id));

  return (
    <div className="space-y-8">
      {/* Group header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/groups" className="text-sm text-muted-foreground hover:text-foreground">
            ← Groups
          </Link>
          <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider mt-1">{group.name}</h1>
          {group.description && (
            <p className="text-muted-foreground text-sm mt-0.5">{group.description}</p>
          )}
        </div>
        <div className="text-right text-xs text-muted-foreground">
          <p>Invite code</p>
          <p className="font-mono font-bold text-foreground text-base">{group.invite_code}</p>
        </div>
      </div>

      {/* Members */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Members ({members?.length ?? 0})
          </h2>
          <div className="flex gap-2">
            <InviteByEmailButton groupId={groupId} />
            <AddManagedProfileButton
              groupId={groupId}
              existingManagedProfiles={availableManagedProfiles}
            />
          </div>
        </div>
        <MemberList
          members={
            (members ?? []) as unknown as {
              role: "admin" | "member";
              users: Pick<User, "id" | "name" | "profile_image" | "managed_by_user_id">;
            }[]
          }
          groupId={groupId}
          currentUserId={user.id}
          isAdmin={membership.role === "admin"}
        />
      </section>

      {/* Danger zone — creator only */}
      {group.created_by === user.id && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Danger zone
          </h2>
          <DeleteGroupButton groupId={groupId} groupName={group.name} />
        </section>
      )}
    </div>
  );
}
