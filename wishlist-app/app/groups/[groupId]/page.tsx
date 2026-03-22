import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import type { Wishlist, User } from "@/lib/types";
import CreateWishlistForm from "@/components/wishlists/CreateWishlistForm";

interface Props {
  params: { groupId: string };
}

export default async function GroupPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify membership and fetch group
  const { data: membership } = await supabase
    .from("group_members")
    .select("role, groups(id, name, description, invite_code)")
    .eq("group_id", params.groupId)
    .eq("user_id", user.id)
    .single();

  if (!membership) notFound();

  const group = membership.groups as unknown as {
    id: string;
    name: string;
    description: string | null;
    invite_code: string;
  };

  // Fetch all members
  const { data: members } = await supabase
    .from("group_members")
    .select("role, users(id, name, profile_image)")
    .eq("group_id", params.groupId);

  // Fetch wishlists (grouped by member)
  const { data: wishlists } = await supabase
    .from("wishlists")
    .select("*, users(id, name, profile_image)")
    .eq("group_id", params.groupId)
    .order("created_at", { ascending: false });

  const myWishlists = (wishlists ?? []).filter((w) => w.user_id === user.id);
  const otherWishlists = (wishlists ?? []).filter((w) => w.user_id !== user.id);

  return (
    <div className="space-y-8">
      {/* Group header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/dashboard" className="text-sm text-gray-400 hover:text-gray-600">
            ← Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1">{group.name}</h1>
          {group.description && (
            <p className="text-gray-500 text-sm mt-0.5">{group.description}</p>
          )}
        </div>
        <div className="text-right text-xs text-gray-400">
          <p>Invite code</p>
          <p className="font-mono font-bold text-gray-700 text-base">{group.invite_code}</p>
        </div>
      </div>

      {/* Members */}
      <section>
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
          Members ({members?.length ?? 0})
        </h2>
        <div className="flex flex-wrap gap-2">
          {(members ?? []).map((m) => {
            const u = m.users as unknown as User;
            return (
              <div key={u.id} className="flex items-center gap-2 bg-white border border-gray-200 rounded-full px-3 py-1.5">
                {u.profile_image && (
                  <img src={u.profile_image} alt={u.name} className="w-5 h-5 rounded-full" />
                )}
                <span className="text-sm text-gray-700">{u.name}</span>
                {m.role === "admin" && (
                  <span className="text-xs text-red-500 font-medium">admin</span>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* My Wishlists */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">My Wishlists</h2>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {myWishlists.map((w) => (
            <Link
              key={w.id}
              href={`/groups/${params.groupId}/wishlists/${w.id}`}
              className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
            >
              <p className="font-semibold text-gray-900">{w.title}</p>
              {w.occasion_date && (
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(w.occasion_date).toLocaleDateString()}
                </p>
              )}
            </Link>
          ))}
          <CreateWishlistForm groupId={params.groupId} userId={user.id} />
        </div>
      </section>

      {/* Others' Wishlists */}
      {otherWishlists.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Others&apos; Wishlists
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {otherWishlists.map((w) => {
              const owner = w.users as unknown as User;
              return (
                <Link
                  key={w.id}
                  href={`/groups/${params.groupId}/wishlists/${w.id}`}
                  className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-red-300 hover:shadow-sm transition-all"
                >
                  <div className="flex items-center gap-2 mb-1">
                    {owner.profile_image && (
                      <img src={owner.profile_image} alt={owner.name} className="w-5 h-5 rounded-full" />
                    )}
                    <span className="text-xs text-gray-500">{owner.name}</span>
                  </div>
                  <p className="font-semibold text-gray-900">{w.title}</p>
                  {w.occasion_date && (
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(w.occasion_date).toLocaleDateString()}
                    </p>
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
