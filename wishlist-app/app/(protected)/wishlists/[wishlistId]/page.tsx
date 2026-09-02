import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { User, Item, Claim } from "@/lib/types";
import ItemCard from "@/components/items/ItemCard";
import AddItemForm from "@/components/items/AddItemForm";
import AddSecretItemForm from "@/components/items/AddSecretItemForm";
import MemberList from "@/components/groups/MemberList";

interface Props {
  params: Promise<{ wishlistId: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function WishlistDetailPage({ params, searchParams }: Props) {
  const { wishlistId } = await params;
  const { from: fromUserId } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch wishlist + owner (RLS handles visibility)
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("*, users(id, name, profile_image), wishlist_groups(id, group_id, groups(id, name))")
    .eq("id", wishlistId)
    .single();

  if (!wishlist) notFound();

  // Groups this wishlist is shared with. A non-owner viewer only gets back rows for
  // groups they belong to, so one friend circle never leaks to another.
  const sharedGroups = (wishlist.wishlist_groups ?? []) as {
    id: string;
    group_id: string;
    groups: { id: string; name: string };
  }[];

  const groupIds = sharedGroups.map((wg) => wg.group_id);
  const { data: memberRows } = groupIds.length
    ? await supabase
        .from("group_members")
        .select("group_id, role, users(id, name, profile_image)")
        .in("group_id", groupIds)
    : { data: [] };

  const membersByGroup = new Map<
    string,
    { role: "admin" | "member"; users: Pick<User, "id" | "name" | "profile_image"> }[]
  >();
  for (const row of memberRows ?? []) {
    const list = membersByGroup.get(row.group_id) ?? [];
    list.push(row as unknown as {
      role: "admin" | "member";
      users: Pick<User, "id" | "name" | "profile_image">;
    });
    membersByGroup.set(row.group_id, list);
  }

  const isOwner = wishlist.user_id === user.id;
  const owner = wishlist.users as unknown as User;

  // Fetch items — RLS hides secret gift items from owner
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("wishlist_id", wishlistId)
    .order("created_at", { ascending: true });

  // Fetch claims — RLS hides claims from wishlist owner
  const { data: claims } = await supabase
    .from("claims")
    .select("*, users(id, name, profile_image)")
    .in("item_id", (items ?? []).map((i) => i.id));

  const claimsByItem = new Map<string, (Claim & { users: User })[]>();
  for (const claim of claims ?? []) {
    const list = claimsByItem.get(claim.item_id) ?? [];
    list.push(claim as Claim & { users: User });
    claimsByItem.set(claim.item_id, list);
  }

  const regularItems = (items ?? []).filter((i) => !i.is_secret_gift);
  const secretItems = (items ?? []).filter((i) => i.is_secret_gift);

  // Resolve back-link depending on navigation context
  const backHref = fromUserId ? `/people/${fromUserId}` : isOwner ? "/wishlists" : "/dashboard";
  const backLabel = fromUserId ? "← Back to profile" : isOwner ? "← My Wishlists" : "← Dashboard";

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={backHref} className="text-sm text-muted-foreground hover:text-foreground">
          {backLabel}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          {owner.profile_image && (
            <img src={owner.profile_image} alt={owner.name} className="w-8 h-8 rounded-full" />
          )}
          <div>
            <h1 className="text-2xl font-heading font-bold text-foreground uppercase tracking-wider">{wishlist.title}</h1>
            <p className="text-sm text-muted-foreground">
              {isOwner ? "Your wishlist" : `${owner.name}'s wishlist`}
              {wishlist.occasion_date &&
                ` · ${new Date(wishlist.occasion_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {wishlist.description && (
          <p className="text-foreground/80 mt-2">{wishlist.description}</p>
        )}
      </div>

      {/* Owner privacy notice */}
      {isOwner && (
        <div className="bg-muted border border-border rounded-none p-4 text-sm text-foreground">
          🔒 <strong>Your view is private.</strong> You cannot see who (if anyone) has claimed your items — your surprise is preserved!
        </div>
      )}

      {/* Shared with */}
      <section>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Shared with
        </h2>
        {sharedGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">Not shared with any group.</p>
        ) : (
          <div className="space-y-3">
            {sharedGroups.map((wg) => (
              <div key={wg.id}>
                <p className="font-medium text-sm text-foreground mb-1.5">
                  {wg.groups?.name ?? wg.group_id}
                </p>
                <MemberList members={membersByGroup.get(wg.group_id) ?? []} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Items */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Items ({regularItems.length})
          </h2>
        </div>

        {regularItems.length === 0 ? (
          <p className="text-muted-foreground text-sm">No items yet.</p>
        ) : (
          <div className="grid gap-3">
            {regularItems.map((item) => (
              <ItemCard
                key={item.id}
                item={item as Item}
                claims={claimsByItem.get(item.id) ?? []}
                currentUserId={user.id}
                isOwner={isOwner}
                wishlistOwnerId={wishlist.user_id}
              />
            ))}
          </div>
        )}

        {isOwner && (
          <div className="mt-4">
            <AddItemForm wishlistId={wishlistId} userId={user.id} isSecret={false} />
          </div>
        )}
      </section>

      {/* Secret gift items — only visible to non-owners */}
      {!isOwner && (
        <section>
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-4">
            🤫 Secret Gift Items ({secretItems.length})
            <span className="ml-2 text-xs font-normal normal-case text-muted-foreground">
              — hidden from {owner.name}
            </span>
          </h2>

          {secretItems.length === 0 ? (
            <p className="text-muted-foreground text-sm">No secret items yet.</p>
          ) : (
            <div className="grid gap-3">
              {secretItems.map((item) => (
                <ItemCard
                  key={item.id}
                  item={item as Item}
                  claims={claimsByItem.get(item.id) ?? []}
                  currentUserId={user.id}
                  isOwner={false}
                  wishlistOwnerId={wishlist.user_id}
                />
              ))}
            </div>
          )}

          <div className="mt-4">
            <AddSecretItemForm wishlistId={wishlistId} userId={user.id} />
          </div>
        </section>
      )}
    </div>
  );
}
