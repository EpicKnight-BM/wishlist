"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Badge } from "@/components/ui/badge";
import { IconX } from "@tabler/icons-react";

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
    return <span className="text-xs text-muted-foreground italic">Not shared with any group</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {groups.map((g) => (
        <Badge key={g.wishlistGroupId} variant="outline" className="gap-1">
          {g.groupName}
          <button
            onClick={() => handleRemove(g.wishlistGroupId)}
            disabled={removing === g.wishlistGroupId}
            className="hover:text-foreground disabled:opacity-40 leading-none"
            title={`Remove from ${g.groupName}`}
          >
            <IconX className="size-2.5" />
          </button>
        </Badge>
      ))}
    </div>
  );
}
