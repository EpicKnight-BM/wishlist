"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function JoinGroupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }

    // Find group by invite code
    const { data: group, error: groupError } = await supabase
      .from("groups")
      .select("id")
      .eq("invite_code", code.trim().toLowerCase())
      .single();

    if (groupError || !group) {
      setError("Invalid invite code. Please check and try again.");
      setLoading(false);
      return;
    }

    // Check if already a member
    const { data: existing } = await supabase
      .from("group_members")
      .select("id")
      .eq("group_id", group.id)
      .eq("user_id", user.id)
      .single();

    if (existing) {
      router.push(`/groups/${group.id}`);
      return;
    }

    // Join
    const { error: joinError } = await supabase
      .from("group_members")
      .insert({ user_id: user.id, group_id: group.id, role: "member" });

    if (joinError) {
      setError(joinError.message);
      setLoading(false);
      return;
    }

    router.push(`/groups/${group.id}`);
  }

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Join a Group</h1>
      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Invite Code *</label>
          <input
            type="text"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="e.g. a1b2c3d4"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-red-400"
          />
          <p className="text-xs text-gray-400 mt-1">Ask a group admin for the 8-character invite code.</p>
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
            disabled={loading || !code.trim()}
            className="flex-1 py-2.5 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
          >
            {loading ? "Joining…" : "Join Group"}
          </button>
        </div>
      </form>
    </div>
  );
}
