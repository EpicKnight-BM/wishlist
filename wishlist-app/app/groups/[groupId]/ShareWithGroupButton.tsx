"use client";

import { useState } from "react";
import ShareWithGroupModal from "@/components/wishlists/ShareWithGroupModal";

interface Props {
  userId: string;
  groupId: string;
  eligibleWishlists: { id: string; name: string }[];
}

export default function ShareWithGroupButton({ userId, groupId, eligibleWishlists }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        + Share a wishlist
      </button>
      {open && (
        <ShareWithGroupModal
          userId={userId}
          groupId={groupId}
          options={eligibleWishlists}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
