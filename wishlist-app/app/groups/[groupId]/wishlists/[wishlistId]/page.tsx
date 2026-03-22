import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { User, Item, Claim } from "@/lib/types";
import ItemCard from "@/components/items/ItemCard";
import AddItemForm from "@/components/items/AddItemForm";
import AddSecretItemForm from "@/components/items/AddSecretItemForm";

interface Props {
  params: Promise<{ groupId: string; wishlistId: string }>;
}

export default async function WishlistPage({ params }: Props) {
  const { groupId, wishlistId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch wishlist + owner info
  const { data: wishlist } = await supabase
    .from("wishlists")
    .select("*, users(id, name, profile_image)")
    .eq("id", wishlistId)
    .eq("group_id", groupId)
    .single();

  if (!wishlist) notFound();

  const isOwner = wishlist.user_id === user.id;
  const owner = wishlist.users as unknown as User;

  // Fetch items — RLS automatically hides secret gift items from the owner
  const { data: items } = await supabase
    .from("items")
    .select("*")
    .eq("wishlist_id", wishlistId)
    .order("created_at", { ascending: true });

  // Fetch claims — RLS automatically hides claims from the wishlist owner
  const { data: claims } = await supabase
    .from("claims")
    .select("*, users(id, name, profile_image)")
    .in("item_id", (items ?? []).map((i) => i.id));

  // Map claims by item id for quick lookup
  const claimsByItem = new Map<string, (Claim & { users: User })[]>();
  for (const claim of claims ?? []) {
    const list = claimsByItem.get(claim.item_id) ?? [];
    list.push(claim as Claim & { users: User });
    claimsByItem.set(claim.item_id, list);
  }

  const regularItems = (items ?? []).filter((i) => !i.is_secret_gift);
  const secretItems = (items ?? []).filter((i) => i.is_secret_gift);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <Link href={`/groups/${groupId}`} className="text-sm text-gray-400 hover:text-gray-600">
          ← {isOwner ? "Back to group" : `${owner.name}'s group`}
        </Link>
        <div className="flex items-center gap-3 mt-2">
          {owner.profile_image && (
            <img src={owner.profile_image} alt={owner.name} className="w-8 h-8 rounded-full" />
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{wishlist.title}</h1>
            <p className="text-sm text-gray-500">
              {isOwner ? "Your wishlist" : `${owner.name}'s wishlist`}
              {wishlist.occasion_date &&
                ` · ${new Date(wishlist.occasion_date).toLocaleDateString()}`}
            </p>
          </div>
        </div>
        {wishlist.description && (
          <p className="text-gray-600 mt-2">{wishlist.description}</p>
        )}
      </div>

      {/* Owner privacy notice */}
      {isOwner && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
          🔒 <strong>Your view is private.</strong> You cannot see who (if anyone) has claimed your items — your surprise is preserved!
        </div>
      )}

      {/* Items */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Items ({regularItems.length})
          </h2>
        </div>

        {regularItems.length === 0 ? (
          <p className="text-gray-400 text-sm">No items yet.</p>
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

        {/* Add item (owner only adds regular items here) */}
        {isOwner && (
          <div className="mt-4">
            <AddItemForm
              wishlistId={wishlistId}
              userId={user.id}
              isSecret={false}
            />
          </div>
        )}
      </section>

      {/* Secret gift items — only visible to non-owners (gift givers) */}
      {!isOwner && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            🤫 Secret Gift Items ({secretItems.length})
            <span className="ml-2 text-xs font-normal normal-case text-gray-400">
              — hidden from {owner.name}
            </span>
          </h2>

          {secretItems.length === 0 ? (
            <p className="text-gray-400 text-sm">No secret items yet.</p>
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
            <AddSecretItemForm
              wishlistId={wishlistId}
              userId={user.id}
            />
          </div>
        </section>
      )}
    </div>
  );
}
