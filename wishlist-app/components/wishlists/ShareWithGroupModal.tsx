"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h2 className="text-lg font-bold text-gray-900">
          {wishlistId ? "Share wishlist with a group" : "Share a wishlist with this group"}
        </h2>

        <form onSubmit={handleShare} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-600 mb-1">{label}</label>
            {options.length === 0 ? (
              <p className="text-sm text-gray-400 italic">
                {wishlistId
                  ? "You have no groups to share with, or this wishlist is already in all your groups."
                  : "You have no wishlists to share yet."}
              </p>
            ) : (
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value)}
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
              >
                <option value="">— choose —</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selected || options.length === 0}
              className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
            >
              {loading ? "Sharing…" : "Share"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
