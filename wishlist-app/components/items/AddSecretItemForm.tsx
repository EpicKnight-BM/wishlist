"use client";

import AddItemForm from "./AddItemForm";

interface Props {
  wishlistId: string;
  userId: string;
}

// Thin wrapper so the wishlist page can import a semantically named component
export default function AddSecretItemForm({ wishlistId, userId }: Props) {
  return (
    <div>
      <p className="text-xs text-gray-400 mb-2">
        Secret items are hidden from the wishlist owner — only gift givers can see them.
      </p>
      <AddItemForm wishlistId={wishlistId} userId={userId} isSecret={true} />
    </div>
  );
}
