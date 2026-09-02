import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { User } from "@/lib/types";
import InviteByEmailButton from "./InviteByEmailButton";
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
    .select("role, groups(id, name, description, invite_code)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const group = membership.groups as unknown as {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
  };

  // Fetch all members
  const { data: members } = await supabase
    .from("group_members")
    .select("role, users(id, name, profile_image)")
    .eq("group_id", groupId);

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
          <InviteByEmailButton groupId={groupId} />
        </div>
        <MemberList
          members={
            (members ?? []) as unknown as {
              role: "admin" | "member";
              users: Pick<User, "id" | "name" | "profile_image">;
            }[]
          }
        />
      </section>
    </div>
  );
}
