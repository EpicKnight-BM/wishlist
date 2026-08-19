"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

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
        className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-400 hover:border-red-300 hover:text-red-400 transition-colors text-sm w-full"
      >
        + Create Wishlist
      </button>
    );
  }

  return (
    <form
      onSubmit={handleCreate}
      className="bg-white rounded-xl border border-red-300 p-4 space-y-3"
    >
      <input
        autoFocus
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Wishlist title (e.g. Christmas 2026)"
        required
        maxLength={100}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      <input
        type="date"
        value={occasionDate}
        onChange={(e) => setOccasionDate(e.target.value)}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !title.trim()}
          className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Creating…" : "Create"}
        </button>
      </div>
    </form>
  );
}
