import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Group } from "@/lib/types";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch groups the user belongs to, with member count
  const { data: memberships } = await supabase
    .from("group_members")
    .select("role, groups(id, name, description, invite_code, created_at)")
    .eq("user_id", user.id)
    .order("joined_at", { ascending: false });

  const groups = (memberships ?? []).map((m) => ({
    ...(m.groups as unknown as Group),
    role: m.role,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Groups</h1>
        <div className="flex gap-2">
          <Link
            href="/groups/join"
            className="px-4 py-2 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Join Group
          </Link>
          <Link
            href="/groups/new"
            className="px-4 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
          >
            + New Group
          </Link>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-lg font-medium">No groups yet</p>
          <p className="text-sm mt-1">Create a group or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link
              key={group.id}
              href={`/groups/${group.id}`}
              className="block bg-white rounded-2xl border border-gray-200 p-5 hover:border-red-300 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-semibold text-gray-900 text-lg">{group.name}</h2>
                  {group.description && (
                    <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{group.description}</p>
                  )}
                </div>
                {group.role === "admin" && (
                  <span className="shrink-0 text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
                    Admin
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Invite code: <span className="font-mono font-semibold">{group.invite_code}</span>
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
