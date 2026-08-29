import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ groupId: string; wishlistId: string }>;
}

export default async function LegacyWishlistPage({ params }: Props) {
  // `from` now carries a person id, not a group id — drop it and let the
  // wishlist page fall back to its default back-link.
  const { wishlistId } = await params;
  redirect(`/wishlists/${wishlistId}`);
}
