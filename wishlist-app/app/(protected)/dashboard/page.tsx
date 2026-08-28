import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Group } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

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
        <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">My Groups</h1>
        <div className="flex gap-2">
          <Button variant="outline" nativeButton={false} render={<Link href="/groups/join" />}>
            Join Group
          </Button>
          <Button nativeButton={false} render={<Link href="/groups/new" />}>
            + New Group
          </Button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <div className="text-5xl mb-4">👥</div>
          <p className="text-lg font-medium">No groups yet</p>
          <p className="text-sm mt-1">Create a group or join one with an invite code.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {groups.map((group) => (
            <Link key={group.id} href={`/groups/${group.id}`} className="block h-full">
              <Card className="h-full hover:ring-ring/50 transition-all">
                <CardContent>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h2 className="font-semibold text-foreground text-lg">{group.name}</h2>
                      {group.description && (
                        <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{group.description}</p>
                      )}
                    </div>
                    {group.role === "admin" && (
                      <Badge variant="secondary" className="shrink-0">Admin</Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-3">
                    Invite code: <span className="font-mono font-semibold">{group.invite_code}</span>
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
