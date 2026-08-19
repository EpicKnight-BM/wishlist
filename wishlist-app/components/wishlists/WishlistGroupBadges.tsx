"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface GroupBadge {
  wishlistGroupId: string;
  groupId: string;
  groupName: string;
}

interface Props {
  wishlistId: string;
  groups: GroupBadge[];
}

export default function WishlistGroupBadges({ wishlistId, groups }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [removing, setRemoving] = useState<string | null>(null);

  async function handleRemove(wishlistGroupId: string) {
    setRemoving(wishlistGroupId);
    await supabase.from("wishlist_groups").delete().eq("id", wishlistGroupId);
    setRemoving(null);
    router.refresh();
  }

  if (groups.length === 0) {
    return <span className="text-xs text-gray-400 italic">Not shared with any group</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <span
          key={g.wishlistGroupId}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full border border-blue-200"
        >
          {g.groupName}
          <button
            onClick={() => handleRemove(g.wishlistGroupId)}
            disabled={removing === g.wishlistGroupId}
            className="hover:text-blue-900 disabled:opacity-40 leading-none"
            title={`Remove from ${g.groupName}`}
          >
            ×
          </button>
        </span>
      ))}
    </div>
  );
}
