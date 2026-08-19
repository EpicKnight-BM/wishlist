"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Item } from "@/lib/types";

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
    <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-900 truncate">{item.name}</p>
          {item.description && (
            <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
          )}
          <div className="flex gap-3 mt-1 text-xs text-gray-400">
            {item.price != null && (
              <span className="font-medium text-gray-700">${(item.price as number).toFixed(2)}</span>
            )}
            {item.quantity > 1 && <span>Qty: {item.quantity}</span>}
          </div>
        </div>
        <button
          onClick={handleDelete}
          disabled={loading}
          className="text-gray-300 hover:text-red-400 transition-colors text-lg leading-none shrink-0"
          title="Delete item"
        >
          ×
        </button>
      </div>

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

      {/* Attach to wishlist */}
      {wishlists.length > 0 && (
        attaching ? (
          <div className="flex gap-2">
            <select
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
            >
              <option value="">— choose wishlist —</option>
              {wishlists.map((w) => (
                <option key={w.id} value={w.id}>{w.title}</option>
              ))}
            </select>
            <button
              onClick={handleAttach}
              disabled={!selected || loading}
              className="px-3 py-1.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "…" : "Attach"}
            </button>
            <button
              onClick={() => { setAttaching(false); setSelected(""); }}
              className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setAttaching(true)}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            + Attach to wishlist
          </button>
        )
      )}
    </div>
  );
}
