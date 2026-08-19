import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import type { Item } from "@/lib/types";
import AddItemForm from "@/components/items/AddItemForm";
import UnattachedItemCard from "./UnattachedItemCard";

export default async function ItemsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // All items added by the user
  const { data: items } = await supabase
    .from("items")
    .select("*, wishlists(id, title)")
    .eq("added_by_user_id", user.id)
    .order("created_at", { ascending: false });

  // User's wishlists for the attach-inline dropdown
  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("id, title")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  const unattached = (items ?? []).filter((i) => !i.wishlist_id);
  const attached = (items ?? []).filter((i) => i.wishlist_id);

  const wishlistOptions = (wishlists ?? []).map((w) => ({ id: w.id, title: w.title }));

  return (
    <div className="space-y-10">
      <div>
        <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
          ← Dashboard
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 mt-1">My Items</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          All items you&apos;ve added — attach them to a wishlist or keep them in your personal pool.
        </p>
      </div>

      {/* Unattached items */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
            Unattached ({unattached.length})
          </h2>
        </div>

        {unattached.length === 0 ? (
          <p className="text-gray-400 text-sm">No unattached items.</p>
        ) : (
          <div className="grid gap-3">
            {unattached.map((item) => (
              <UnattachedItemCard
                key={item.id}
                item={item as Item}
                wishlists={wishlistOptions}
              />
            ))}
          </div>
        )}

        <div className="mt-4">
          <AddItemForm
            userId={user.id}
            isSecret={false}
            wishlists={wishlistOptions}
          />
        </div>
      </section>

      {/* Items in a wishlist */}
      {attached.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            In a Wishlist ({attached.length})
          </h2>
          <div className="grid gap-3">
            {attached.map((item) => {
              const wl = item.wishlists as unknown as { id: string; title: string } | null;
              return (
                <div
                  key={item.id}
                  className="bg-white rounded-xl border border-gray-200 p-4 flex items-center justify-between gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{item.name}</p>
                    {item.description && (
                      <p className="text-sm text-gray-500 mt-0.5 truncate">{item.description}</p>
                    )}
                    {item.price != null && (
                      <p className="text-xs text-gray-400 mt-0.5">${(item.price as number).toFixed(2)}</p>
                    )}
                  </div>
                  {wl && (
                    <Link
                      href={`/wishlists/${wl.id}`}
                      className="text-xs text-blue-600 hover:underline shrink-0"
                    >
                      {wl.title} →
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
