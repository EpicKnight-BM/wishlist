"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createGroup } from "./actions";

export default function NewGroupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const group = await createGroup(name.trim(), description.trim() || null);
      router.push(`/groups/${group.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Create a New Group</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Smith Family"
            required
            maxLength={80}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this group for?"
            rows={3}
            maxLength={300}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-2.5 rounded-lg border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Creating…" : "Create Group"}
          </button>
        </div>
      </form>
    </div>
  );
}
