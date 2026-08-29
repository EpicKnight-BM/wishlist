import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Props {
  params: Promise<{ userId: string }>;
}

export default async function PersonPage({ params }: Props) {
  const { userId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Not reachable from the people list (it excludes you), but guard direct URLs
  if (userId === user.id) redirect("/wishlists");

  // Visibility check: we must share at least one group
  const { data: myMemberships } = await supabase
    .from("group_members")
    .select("group_id")
    .eq("user_id", user.id);

  const myGroupIds = (myMemberships ?? []).map((m) => m.group_id);

  const { data: sharedMemberships } = myGroupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, groups(id, name)")
        .eq("user_id", userId)
        .in("group_id", myGroupIds)
    : { data: [] };

  if (!sharedMemberships || sharedMemberships.length === 0) notFound();

  const sharedGroups = sharedMemberships
    .map((m) => m.groups as unknown as { id: string; name: string })
    .filter(Boolean);

  const { data: person } = await supabase
    .from("users")
    .select("id, name, profile_image")
    .eq("id", userId)
    .single();

  if (!person) notFound();

  // RLS scopes this to wishlists shared with a group I'm in
  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("*, wishlist_groups(id, group_id, groups(id, name))")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  // Future: "Preferences" section (sizes, favorite stores, etc.) — no `preferences` table yet

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← People
        </Link>
        <div className="flex items-center gap-3 mt-2">
          {person.profile_image && (
            <img
              src={person.profile_image}
              alt={person.name}
              className="w-12 h-12 rounded-full object-cover border border-border"
            />
          )}
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">
              {person.name}
            </h1>
            <div className="flex flex-wrap items-center gap-1.5 mt-1">
              <span className="text-xs text-muted-foreground">You&apos;re both in</span>
              {sharedGroups.map((g) => (
                <Badge key={g.id} variant="outline">{g.name}</Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Their wishlists */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Wishlists ({(wishlists ?? []).length})
        </h2>

        {(wishlists ?? []).length === 0 ? (
          <p className="text-sm text-muted-foreground">No wishlists shared with you yet.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {(wishlists ?? []).map((w) => {
              const wgEntries = (w.wishlist_groups ?? []) as {
                id: string;
                group_id: string;
                groups: { id: string; name: string };
              }[];

              return (
                <Link key={w.id} href={`/wishlists/${w.id}?from=${userId}`} className="h-full">
                  <Card size="sm" className="h-full hover:ring-ring/50 transition-all">
                    <CardContent>
                      <p className="font-semibold text-foreground">{w.title}</p>
                      {w.occasion_date && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(w.occasion_date).toLocaleDateString()}
                        </p>
                      )}
                      {wgEntries.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {wgEntries.map((e) => (
                            <Badge key={e.id} variant="outline">{e.groups?.name ?? e.group_id}</Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
