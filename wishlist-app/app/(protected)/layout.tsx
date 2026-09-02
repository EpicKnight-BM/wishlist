import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import SignOutButton from "@/components/auth/SignOutButton";
import ThemeToggle from "@/components/theme/ThemeToggle";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, profile_image")
    .eq("id", user.id)
    .single();

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top nav */}
      <header className="bg-background border-b border-border sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 font-heading font-bold text-foreground text-lg uppercase tracking-wider">
            <span>🎁</span>
            <span>Wishlist</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-1 text-sm">
            <Link href="/items" className="px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              My Items
            </Link>
            <Link href="/wishlists" className="px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              My Wishlists
            </Link>
            <Link href="/groups" className="px-3 py-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors">
              Groups
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            {profile?.profile_image && (
              <img
                src={profile.profile_image}
                alt={profile.name}
                className="w-8 h-8 rounded-full object-cover border border-border"
              />
            )}
            <span className="text-sm text-muted-foreground hidden sm:block">{profile?.name}</span>
            <ThemeToggle />
            <SignOutButton />
          </div>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        {children}
      </main>
    </div>
  );
}
