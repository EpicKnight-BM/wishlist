"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  /** Profiles this user manages (e.g. a child without their own account) — lets them create a wishlist on that profile's behalf. */
  managedProfiles?: { id: string; name: string }[];
}

export default function CreateWishlistForm({ userId, managedProfiles = [] }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [ownerId, setOwnerId] = useState(userId);
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
        user_id: ownerId,
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
          {managedProfiles.length > 0 && (
            <div>
              <Label className="mb-1">For</Label>
              <Select
                items={{ [userId]: "Yourself", ...Object.fromEntries(managedProfiles.map((p) => [p.id, p.name])) }}
                value={ownerId}
                onValueChange={(v) => setOwnerId(v ?? userId)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={userId}>Yourself</SelectItem>
                  {managedProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
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
            <Button
              type="button"
              variant="outline"
              onClick={() => { setOpen(false); setOwnerId(userId); }}
              className="flex-1"
            >
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
