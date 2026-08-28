import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Group } from "@/lib/types";
import CreateWishlistForm from "@/components/wishlists/CreateWishlistForm";
import WishlistGroupBadges from "@/components/wishlists/WishlistGroupBadges";
import ShareWishlistButton from "./ShareWishlistButton";
import { Card, CardContent } from "@/components/ui/card";

export default async function WishlistsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All wishlists owned by the current user, with their group associations
  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("*, wishlist_groups(id, group_id, groups(id, name))")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // All groups the user belongs to (for the share modal)
  const { data: memberships } = await supabase
    .from("group_members")
    .select("group_id, groups(id, name)")
    .eq("user_id", user.id);

  const allGroups = (memberships ?? []).map((m) => m.groups as unknown as Group);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider mt-1">My Wishlists</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Create wishlists and share them with your groups.
        </p>
      </div>

      {(wishlists ?? []).length === 0 ? (
        <p className="text-muted-foreground text-sm">No wishlists yet — create one below!</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {(wishlists ?? []).map((w) => {
            const wgEntries = (w.wishlist_groups ?? []) as {
              id: string;
              group_id: string;
              groups: { id: string; name: string };
            }[];

            const sharedWith = wgEntries.map((e) => ({
              wishlistGroupId: e.id,
              groupId: e.group_id,
              groupName: e.groups?.name ?? e.group_id,
            }));

            // Groups the user belongs to but hasn't added this wishlist to yet
            const alreadySharedGroupIds = new Set(sharedWith.map((s) => s.groupId));
            const eligibleGroups = allGroups
              .filter((g) => !alreadySharedGroupIds.has(g.id))
              .map((g) => ({ id: g.id, name: g.name }));

            return (
              <Card key={w.id} size="sm">
                <CardContent className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/wishlists/${w.id}`}
                        className="font-semibold text-foreground hover:text-primary transition-colors"
                      >
                        {w.title}
                      </Link>
                      {w.occasion_date && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {new Date(w.occasion_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                    <Link
                      href={`/wishlists/${w.id}`}
                      className="text-xs text-primary hover:underline font-medium shrink-0"
                    >
                      View →
                    </Link>
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs text-muted-foreground font-medium">Shared with</p>
                    <WishlistGroupBadges wishlistId={w.id} groups={sharedWith} />
                  </div>

                  <ShareWishlistButton
                    userId={user.id}
                    wishlistId={w.id}
                    eligibleGroups={eligibleGroups}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <div className="max-w-sm">
        <CreateWishlistForm userId={user.id} />
      </div>
    </div>
  );
}
