"use client";

import { useState } from "react";
import { inviteToGroupByEmail } from "./actions";

interface Props {
  groupId: string;
}

export default function InviteByEmailButton({ groupId }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setEmail("");
    setError(null);
    setSentTo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSentTo(null);

    try {
      const { sentTo: address } = await inviteToGroupByEmail(groupId, email);
      setSentTo(address);
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        + Invite by email
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-white rounded-xl border border-red-300 p-4 space-y-3 w-full mt-3"
    >
      <div>
        <label htmlFor="invite-email" className="block text-sm font-medium text-gray-700 mb-1">
          Invite by email
        </label>
        <input
          id="invite-email"
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="friend@example.com"
          required
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <p className="text-xs text-gray-400 mt-1">
          They&apos;ll get a link that joins them to this group.
        </p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}
      {sentTo && (
        <p className="text-xs text-green-600">Invitation sent to {sentTo}.</p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={close}
          className="flex-1 py-2 rounded-lg border border-gray-300 text-sm text-gray-600 hover:bg-gray-50"
        >
          {sentTo ? "Done" : "Cancel"}
        </button>
        <button
          type="submit"
          disabled={loading || !email.trim()}
          className="flex-1 py-2 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 disabled:opacity-50"
        >
          {loading ? "Sending…" : sentTo ? "Send another" : "Send invite"}
        </button>
      </div>
    </form>
  );
}
