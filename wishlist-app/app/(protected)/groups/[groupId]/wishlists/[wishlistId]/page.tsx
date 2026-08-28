import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ groupId: string; wishlistId: string }>;
}

export default async function LegacyWishlistPage({ params }: Props) {
  const { groupId, wishlistId } = await params;
  redirect(`/wishlists/${wishlistId}?from=${groupId}`);
}
