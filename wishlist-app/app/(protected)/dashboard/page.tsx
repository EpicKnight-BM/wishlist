import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { User } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Person {
  user: Pick<User, "id" | "name" | "profile_image">;
  sharedGroups: { id: string; name: string }[];
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Groups I belong to
  const { data: myMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const myGroupIds = (myMemberships ?? []).map((m) => m.group_id);

  // Everyone else in those groups — every group_id here is one I belong to,
  // so `is_group_member` passes for all returned rows.
  const { data: rows } = myGroupIds.length
    ? await supabase
        .from("group_members")
        .select("user_id, group_id, users(id, name, profile_image), groups(id, name)")
        .in("group_id", myGroupIds)
        .neq("user_id", user.id)
    : { data: [] };

  // Dedupe fellow members across groups
  const byUser = new Map<string, Person>();
  for (const row of rows ?? []) {
    const u = row.users as unknown as Pick<User, "id" | "name" | "profile_image">;
    const g = row.groups as unknown as { id: string; name: string };
    if (!u) continue;
    const entry = byUser.get(row.user_id) ?? { user: u, sharedGroups: [] };
    if (g && !entry.sharedGroups.some((sg) => sg.id === g.id)) entry.sharedGroups.push(g);
    byUser.set(row.user_id, entry);
  }

  const people = [...byUser.values()].sort((a, b) => a.user.name.localeCompare(b.user.name));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">People</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Everyone you share a group with — open someone to see their wishlists.
        </p>
      </div>

      {people.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">👋</div>
          <p className="text-lg font-medium">No one here yet</p>
          <p className="text-sm mt-1">
            <Link href="/groups/join" className="text-primary-text hover:underline">Join a group</Link>
            {" or "}
            <Link href="/groups/new" className="text-primary-text hover:underline">create one</Link>
            {" to start sharing wishlists."}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {people.map((p) => (
            <Link key={p.user.id} href={`/people/${p.user.id}`} className="block h-full">
              <Card className="h-full hover:ring-ring/50 transition-all">
                <CardContent>
                  <div className="flex items-center gap-3">
                    {p.user.profile_image && (
                      <img
                        src={p.user.profile_image}
                        alt={p.user.name}
                        className="w-10 h-10 rounded-full object-cover border border-border"
                      />
                    )}
                    <h2 className="font-semibold text-foreground text-lg">{p.user.name}</h2>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    {p.sharedGroups.map((g) => (
                      <Badge key={g.id} variant="outline">{g.name}</Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
