"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ManagedProfile {
  id: string;
  name: string;
}

interface Props {
  groupId: string;
  /** Profiles this user already manages that aren't in this group yet. */
  existingManagedProfiles: ManagedProfile[];
}

/**
 * Lets a member create a profile for someone without their own account
 * (e.g. a young child) and add it to this group — or, if they already
 * manage a profile from another group, add that same profile here
 * instead of minting a second, unrelated one. See issue #7 — a managed
 * profile can't redeem an invite code itself, so this bypasses that
 * flow entirely rather than routing through it.
 */
export default function AddManagedProfileButton({ groupId, existingManagedProfiles }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"existing" | "new">(
    existingManagedProfiles.length > 0 ? "existing" : "new"
  );
  const [selectedId, setSelectedId] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setName("");
    setSelectedId("");
    setError(null);
  }

  async function handleAddExisting(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId) return;
    setLoading(true);
    setError(null);

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ user_id: selectedId, group_id: groupId });

    setLoading(false);
    if (memberError) {
      setError(memberError.message);
      return;
    }
    close();
    router.refresh();
  }

  async function handleCreateNew(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    setLoading(true);
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({ name: trimmed, managed_by_user_id: user.id })
      .select("id")
      .single();

    if (profileError || !profile) {
      setError(profileError?.message ?? "Failed to create the profile");
      setLoading(false);
      return;
    }

    const { error: memberError } = await supabase
      .from("group_members")
      .insert({ user_id: profile.id, group_id: groupId });

    if (memberError) {
      // Don't leave a profile behind that isn't visible anywhere.
      await supabase.from("users").delete().eq("id", profile.id);
      setError(memberError.message);
      setLoading(false);
      return;
    }

    setLoading(false);
    close();
    router.refresh();
  }

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
        + Add a profile
      </Button>
    );
  }

  const hasExisting = existingManagedProfiles.length > 0;

  return (
    <Card className="w-full mt-3 ring-primary/30">
      <CardContent>
        {hasExisting && (
          <div className="flex gap-4 mb-3 text-sm">
            <button
              type="button"
              onClick={() => setMode("existing")}
              className={mode === "existing" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              Add existing
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={mode === "new" ? "font-semibold text-foreground" : "text-muted-foreground"}
            >
              Create new
            </button>
          </div>
        )}

        {mode === "existing" && hasExisting ? (
          <form onSubmit={handleAddExisting} className="space-y-3">
            <div>
              <Label className="mb-1">Which profile?</Label>
              <Select
                items={Object.fromEntries(existingManagedProfiles.map((p) => [p.id, p.name]))}
                value={selectedId}
                onValueChange={(v) => setSelectedId(v ?? "")}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="— choose —" />
                </SelectTrigger>
                <SelectContent>
                  {existingManagedProfiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Adds a profile you already manage to this group too — it stays the
                same person, with the same wishlist.
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !selectedId} className="flex-1">
                {loading ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleCreateNew} className="space-y-3">
            <div>
              <Label htmlFor="managed-name" className="mb-1">Their name</Label>
              <Input
                id="managed-name"
                autoFocus
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sam"
                required
                maxLength={100}
              />
              <p className="text-xs text-muted-foreground mt-1">
                For someone without their own account. You&apos;ll keep full access to
                their wishlist.
              </p>
            </div>

            {error && <p className="text-xs text-destructive">{error}</p>}

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={close} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !name.trim()} className="flex-1">
                {loading ? "Adding…" : "Add"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
