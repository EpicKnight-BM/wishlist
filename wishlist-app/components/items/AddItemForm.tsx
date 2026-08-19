"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface Props {
  userId: string;
  isSecret: boolean;
  /** When omitted the item is created unattached (personal item pool) */
  wishlistId?: string;
  /** Optional list of wishlists to allow inline attachment */
  wishlists?: { id: string; title: string }[];
}

export default function AddItemForm({ userId, isSecret, wishlistId, wishlists }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [url, setUrl] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [getByLabel, setGetByLabel] = useState("");
  const [selectedWishlistId, setSelectedWishlistId] = useState(wishlistId ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    const parsedPrice = price ? parseFloat(price) : null;
    const parsedQty = parseInt(quantity, 10) || 1;

    const { error: dbError } = await supabase.from("items").insert({
      wishlist_id: selectedWishlistId || null,
      added_by_user_id: userId,
      is_secret_gift: isSecret,
      name: name.trim(),
      description: description.trim() || null,
      price: parsedPrice,
      url: url.trim() || null,
      quantity: parsedQty,
      get_by_label: getByLabel.trim() || null,
    });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    setOpen(false);
    setName(""); setDescription(""); setPrice(""); setUrl(""); setQuantity("1"); setGetByLabel("");
    if (!wishlistId) setSelectedWishlistId("");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 text-sm text-red-500 hover:text-red-700 font-medium transition-colors"
      >
        + Add item
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-red-300 p-4 space-y-3 mt-2">
      <p className="text-sm font-semibold text-gray-700">New item</p>
      <input
        autoFocus
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Item name *"
        required
        maxLength={200}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description (color, size, style…)"
        rows={2}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <input
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          placeholder="Price ($)"
          min="0"
          step="0.01"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <input
          type="number"
          value={quantity}
          onChange={(e) => setQuantity(e.target.value)}
          placeholder="Qty"
          min="1"
          className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
      </div>
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Product URL (optional)"
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <input
        type="text"
        value={getByLabel}
        onChange={(e) => setGetByLabel(e.target.value)}
        placeholder="Get by (e.g. Christmas, My Birthday)"
        maxLength={80}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      {/* Wishlist selector — shown when no fixed wishlistId is provided */}
      {!wishlistId && wishlists && wishlists.length > 0 && (
        <select
          value={selectedWishlistId}
          onChange={(e) => setSelectedWishlistId(e.target.value)}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        >
          <option value="">Leave unattached</option>
          {wishlists.map((w) => (
            <option key={w.id} value={w.id}>{w.title}</option>
          ))}
        </select>
      )}
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50">Cancel</button>
        <button type="submit" disabled={loading || !name.trim()} className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50">
          {loading ? "Saving…" : "Add Item"}
        </button>
      </div>
    </form>
  );
}
