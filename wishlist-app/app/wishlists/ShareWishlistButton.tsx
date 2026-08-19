"use client";

import { useState } from "react";
import ShareWithGroupModal from "@/components/wishlists/ShareWithGroupModal";

interface Props {
  userId: string;
  wishlistId: string;
  eligibleGroups: { id: string; name: string }[];
}

export default function ShareWishlistButton({ userId, wishlistId, eligibleGroups }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
      >
        + Share with group
      </button>
      {open && (
        <ShareWithGroupModal
          userId={userId}
          wishlistId={wishlistId}
          options={eligibleGroups}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
