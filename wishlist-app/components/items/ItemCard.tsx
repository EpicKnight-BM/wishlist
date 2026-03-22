"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item, Claim, User } from "@/lib/types";

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
        quantity_claimed: 1,
      });
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
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      {/* Item header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{item.name}</h3>
            {item.is_secret_gift && (
              <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium shrink-0">
                🤫 Secret
              </span>
            )}
          </div>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
            {item.price && (
              <span className="font-medium text-gray-700">${item.price.toFixed(2)}</span>
            )}
            {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
            {item.get_by_label && <span>By: {item.get_by_label}</span>}
          </div>
        </div>

        {/* Delete button (item adder only) */}
        {canEdit && (
          <button
            onClick={handleDelete}
            disabled={loading}
            className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
            title="Remove item"
          >
            ×
          </button>
        )}
      </div>

      {/* Delete warning (shown to owner when item is claimed) */}
      {deleteConfirm && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
          <p className="font-medium mb-2">⚠️ Someone may have already planned to get this for you — are you sure you want to remove it?</p>
          <div className="flex gap-2">
            <button
              onClick={() => setDeleteConfirm(false)}
              className="flex-1 py-1.5 rounded-lg border border-amber-300 text-amber-700 text-xs font-medium hover:bg-amber-100"
            >
              Keep it
            </button>
            <button
              onClick={async () => {
                setLoading(true);
                await supabase.from("items").delete().eq("id", item.id);
                setLoading(false);
                router.refresh();
              }}
              className="flex-1 py-1.5 rounded-lg bg-red-500 text-white text-xs font-medium hover:bg-red-600"
            >
              Remove anyway
            </button>
          </div>
        </div>
      )}

      {/* Product link */}
      {item.url && (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline"
        >
          🔗 View product ↗
        </a>
      )}

      {/* Claim section — not shown to owner at all */}
      {!isOwner && (
        <div className="pt-2 border-t border-gray-100 space-y-2">
          {/* Who claimed */}
          {claims.length > 0 ? (
            <div className="space-y-1">
              {claims.map((c) => (
                <div key={c.id} className="flex items-center gap-2 text-xs text-gray-600">
                  {c.users.profile_image && (
                    <img src={c.users.profile_image} alt={c.users.name} className="w-4 h-4 rounded-full" />
                  )}
                  <span>
                    <strong>{c.claimed_by_user_id === currentUserId ? "You" : c.users.name}</strong> claimed {c.quantity_claimed > 1 ? `× ${c.quantity_claimed}` : ""}
                    {c.is_purchased && " · ✅ Purchased"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-400">Not yet claimed</p>
          )}

          {/* Availability */}
          {item.quantity > 1 && (
            <p className="text-xs text-gray-400">{available} of {item.quantity} still available</p>
          )}

          {/* Claim / Unclaim button */}
          {available > 0 || myClaim ? (
            <div className="flex gap-2">
              <button
                onClick={handleClaim}
                disabled={loading}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 ${
                  myClaim
                    ? "border border-gray-300 text-gray-600 hover:bg-gray-50"
                    : "bg-red-500 text-white hover:bg-red-600"
                }`}
              >
                {loading ? "…" : myClaim ? "Unclaim" : "Claim"}
              </button>
              {myClaim && (
                <button
                  onClick={handleMarkPurchased}
                  disabled={loading}
                  className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
                  title={myClaim.is_purchased ? "Mark as not purchased" : "Mark as purchased"}
                >
                  {myClaim.is_purchased ? "✅" : "🛒"}
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-center text-gray-400 italic">Fully claimed</p>
          )}
        </div>
      )}
    </div>
  );
}
