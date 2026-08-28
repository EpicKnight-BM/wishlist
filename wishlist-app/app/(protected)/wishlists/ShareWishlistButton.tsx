"use client";

import { useState } from "react";
import ShareWithGroupModal from "@/components/wishlists/ShareWithGroupModal";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  wishlistId: string;
  eligibleGroups: { id: string; name: string }[];
}

export default function ShareWishlistButton({ userId, wishlistId, eligibleGroups }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="link" size="sm" onClick={() => setOpen(true)}>
        + Share with group
      </Button>
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
