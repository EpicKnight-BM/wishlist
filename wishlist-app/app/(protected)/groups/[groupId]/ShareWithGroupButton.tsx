"use client";

import { useState } from "react";
import ShareWithGroupModal from "@/components/wishlists/ShareWithGroupModal";
import { Button } from "@/components/ui/button";

interface Props {
  userId: string;
  groupId: string;
  eligibleWishlists: { id: string; name: string }[];
}

export default function ShareWithGroupButton({ userId, groupId, eligibleWishlists }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant="link" size="sm" onClick={() => setOpen(true)}>
        + Share a wishlist
      </Button>
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
