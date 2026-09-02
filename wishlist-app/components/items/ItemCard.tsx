"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item, Claim, User } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { IconX, IconMinus, IconPlus, IconCheck, IconShoppingCart } from "@tabler/icons-react";

interface Props {
  item: Item;
  claims: (Claim & { users: User })[];
  currentUserId: string;
  isOwner: boolean;
  wishlistOwnerId: string;
}

export default function ItemCard({ item, claims, currentUserId, isOwner, wishlistOwnerId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [claimQty, setClaimQty] = useState(1);

  const totalClaimed = claims.reduce((sum, c) => sum + c.quantity_claimed, 0);
  const myClaim = claims.find((c) => c.claimed_by_user_id === currentUserId);
  const available = item.quantity - totalClaimed;

  async function handleClaim() {
    setLoading(true);
    if (myClaim) {
      // Unclaim
      await supabase.from("claims").delete().eq("id", myClaim.id);
    } else {
      // Claim
      await supabase.from("claims").insert({
        item_id: item.id,
        claimed_by_user_id: currentUserId,
        quantity_claimed: claimQty,
      });
      setClaimQty(1);
    }
    setLoading(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!deleteConfirm) {
      // Check if item has claims via the safety function
      const { data } = await supabase.rpc("item_has_claims", { p_item_id: item.id });
      if (data) {
        setDeleteConfirm(true); // Show the warning
        return;
      }
    }
    setLoading(true);
    await supabase.from("items").delete().eq("id", item.id);
    setLoading(false);
    router.refresh();
  }

  async function handleMarkPurchased() {
    if (!myClaim) return;
    setLoading(true);
    await supabase
      .from("claims")
      .update({ is_purchased: !myClaim.is_purchased })
      .eq("id", myClaim.id);
    setLoading(false);
    router.refresh();
  }

  const canEdit = item.added_by_user_id === currentUserId;
  const canClaim = !isOwner && currentUserId !== wishlistOwnerId;

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        {/* Item header */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-foreground truncate">{item.name}</h3>
              {item.is_secret_gift && (
                <Badge variant="secondary" className="shrink-0">🤫 Secret</Badge>
              )}
            </div>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <div className="flex flex-wrap gap-3 mt-1 text-xs text-muted-foreground">
              {item.price && (
                <span className="font-medium text-foreground">${item.price.toFixed(2)}</span>
              )}
              {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
              {item.get_by_label && <span>By: {item.get_by_label}</span>}
            </div>
          </div>

          {/* Delete button (item adder only) */}
          {canEdit && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleDelete}
              disabled={loading}
              title="Remove item"
              className="shrink-0"
            >
              <IconX />
            </Button>
          )}
        </div>

        {/* Delete warning (shown to owner when item is claimed) */}
        {deleteConfirm && (
          <div className="bg-muted border border-border rounded-none p-3 text-sm text-foreground">
            <p className="font-medium mb-2">⚠️ Someone may have already planned to get this for you — are you sure you want to remove it?</p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDeleteConfirm(false)}
                className="flex-1"
              >
                Keep it
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={async () => {
                  setLoading(true);
                  await supabase.from("items").delete().eq("id", item.id);
                  setLoading(false);
                  router.refresh();
                }}
                className="flex-1"
              >
                Remove anyway
              </Button>
            </div>
          </div>
        )}

        {/* Product link */}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary-text hover:underline"
          >
            🔗 View product ↗
          </a>
        )}

        {/* Claim section — not shown to owner at all */}
        {!isOwner && (
          <div className="pt-2 border-t border-border space-y-2">
            {/* Who claimed */}
            {claims.length > 0 ? (
              <div className="space-y-1">
                {claims.map((c) => (
                  <div key={c.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {c.users.profile_image && (
                      <img src={c.users.profile_image} alt={c.users.name} className="w-4 h-4 rounded-full" />
                    )}
                    <span>
                      <strong className="text-foreground">{c.claimed_by_user_id === currentUserId ? "You" : c.users.name}</strong> claimed {c.quantity_claimed > 1 ? `× ${c.quantity_claimed}` : ""}
                      {c.is_purchased && " · ✅ Purchased"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">Not yet claimed</p>
            )}

            {/* Availability */}
            {item.quantity > 1 && (
              <p className="text-xs text-muted-foreground">{available} of {item.quantity} still available</p>
            )}

            {/* Claim / Unclaim button */}
            {available > 0 || myClaim ? (
              <div className="flex gap-2">
                {!myClaim && available > 1 && (
                  <div className="flex items-center border border-input">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setClaimQty((q) => Math.max(1, q - 1))}
                      disabled={loading || claimQty <= 1}
                    >
                      <IconMinus />
                    </Button>
                    <span className="px-2 text-sm font-medium text-foreground min-w-6 text-center">{claimQty}</span>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => setClaimQty((q) => Math.min(available, q + 1))}
                      disabled={loading || claimQty >= available}
                    >
                      <IconPlus />
                    </Button>
                  </div>
                )}
                <Button
                  variant={myClaim ? "outline" : "default"}
                  onClick={handleClaim}
                  disabled={loading}
                  className="flex-1"
                >
                  {loading ? "…" : myClaim ? "Unclaim" : "Claim"}
                </Button>
                {myClaim && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleMarkPurchased}
                    disabled={loading}
                    title={myClaim.is_purchased ? "Mark as not purchased" : "Mark as purchased"}
                  >
                    {myClaim.is_purchased ? <IconCheck /> : <IconShoppingCart />}
                  </Button>
                )}
              </div>
            ) : (
              <p className="text-xs text-center text-muted-foreground italic">Fully claimed</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
