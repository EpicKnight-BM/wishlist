"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ShareOption {
  id: string;
  name: string;
}

interface Props {
  userId: string;
  /** Pass when sharing a specific wishlist with a chosen group */
  wishlistId?: string;
  /** Pass when the group is fixed and user picks which wishlist to share */
  groupId?: string;
  /** Options for the dropdown (groups if wishlistId given, wishlists if groupId given) */
  options: ShareOption[];
  onClose: () => void;
}

export default function ShareWithGroupModal({
  userId,
  wishlistId,
  groupId,
  options,
  onClose,
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = wishlistId ? "Select a group" : "Select a wishlist";

  async function handleShare(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setLoading(true);
    setError(null);

    const payload = wishlistId
      ? { wishlist_id: wishlistId, group_id: selected, added_by: userId }
      : { wishlist_id: selected, group_id: groupId!, added_by: userId };

    const { error: dbError } = await supabase.from("wishlist_groups").insert(payload);

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    onClose();
    router.refresh();
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {wishlistId ? "Share wishlist with a group" : "Share a wishlist with this group"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{label}</p>
            {options.length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                {wishlistId
                  ? "You have no groups to share with, or this wishlist is already in all your groups."
                  : "You have no wishlists to share yet."}
              </p>
            ) : (
              <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="— choose —" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.id} value={o.id}>
                      {o.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !selected || options.length === 0}
              className="flex-1"
            >
              {loading ? "Sharing…" : "Share"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
