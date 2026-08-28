"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  userId: string;
}

export default function CreateWishlistForm({ userId }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [occasionDate, setOccasionDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("wishlists")
      .insert({
        user_id: userId,
        title: title.trim(),
        occasion_date: occasionDate || null,
      })
      .select("id")
      .single();

    if (dbError || !data) {
      setError(dbError?.message ?? "Failed to create wishlist");
      setLoading(false);
      return;
    }

    router.push(`/wishlists/${data.id}`);
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-none p-4 text-muted-foreground hover:border-ring hover:text-foreground transition-colors text-sm w-full"
      >
        + Create Wishlist
      </button>
    );
  }

  return (
    <Card className="ring-primary/30">
      <CardContent>
        <form onSubmit={handleCreate} className="space-y-3">
          <Input
            autoFocus
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Wishlist title (e.g. Christmas 2026)"
            required
            maxLength={100}
          />
          <Input
            type="date"
            value={occasionDate}
            onChange={(e) => setOccasionDate(e.target.value)}
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !title.trim()} className="flex-1">
              {loading ? "Creating…" : "Create"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
