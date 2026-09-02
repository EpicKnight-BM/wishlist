"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
      <Button onClick={() => setOpen(true)}>
        + Add item
      </Button>
    );
  }

  return (
    <Card className="mt-2 ring-primary/30">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <p className="text-sm font-semibold text-foreground">New item</p>
          <Input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Item name *"
            required
            maxLength={200}
          />
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (color, size, style…)"
            rows={2}
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Price ($)"
              min="0"
              step="0.01"
            />
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Qty"
              min="1"
            />
          </div>
          <Input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Product URL (optional)"
          />
          <Input
            type="text"
            value={getByLabel}
            onChange={(e) => setGetByLabel(e.target.value)}
            placeholder="Get by (e.g. Christmas, My Birthday)"
            maxLength={80}
          />
          {/* Wishlist selector — shown when no fixed wishlistId is provided */}
          {!wishlistId && wishlists && wishlists.length > 0 && (
            <Select
              items={Object.fromEntries(wishlists.map((w) => [w.id, w.title]))}
              value={selectedWishlistId}
              onValueChange={(v) => setSelectedWishlistId(v ?? "")}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Leave unattached" />
              </SelectTrigger>
              <SelectContent>
                {wishlists.map((w) => (
                  <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
              {loading ? "Saving…" : "Add Item"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
