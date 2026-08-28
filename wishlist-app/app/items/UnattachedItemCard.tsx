"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { IconX } from "@tabler/icons-react";

interface Props {
  item: Item;
  wishlists: { id: string; title: string }[];
}

export default function UnattachedItemCard({ item, wishlists }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [attaching, setAttaching] = useState(false);
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAttach() {
    if (!selected) return;
    setLoading(true);
    await supabase.from("items").update({ wishlist_id: selected }).eq("id", item.id);
    setLoading(false);
    setAttaching(false);
    setSelected("");
    router.refresh();
  }

  async function handleDelete() {
    setLoading(true);
    await supabase.from("items").delete().eq("id", item.id);
    setLoading(false);
    router.refresh();
  }

  return (
    <Card size="sm">
      <CardContent className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-foreground truncate">{item.name}</p>
            {item.description && (
              <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
              {item.price != null && (
                <span className="font-medium text-foreground">${(item.price as number).toFixed(2)}</span>
              )}
              {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleDelete}
            disabled={loading}
            title="Delete item"
            className="shrink-0"
          >
            <IconX />
          </Button>
        </div>

        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            🔗 View product ↗
          </a>
        )}

        {/* Attach to wishlist */}
        {wishlists.length > 0 && (
          attaching ? (
            <div className="flex gap-2">
              <Select value={selected} onValueChange={(v) => setSelected(v ?? "")}>
                <SelectTrigger className="flex-1 border-b border-input">
                  <SelectValue placeholder="— choose wishlist —" />
                </SelectTrigger>
                <SelectContent>
                  {wishlists.map((w) => (
                    <SelectItem key={w.id} value={w.id}>{w.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={handleAttach} disabled={!selected || loading} size="sm">
                {loading ? "…" : "Attach"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setAttaching(false); setSelected(""); }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <Button variant="link" size="sm" onClick={() => setAttaching(true)}>
              + Attach to wishlist
            </Button>
          )
        )}
      </CardContent>
    </Card>
  );
}
