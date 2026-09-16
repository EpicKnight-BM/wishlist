"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

const LAST_ADMIN_MESSAGE =
  "They're the only admin left — promote someone else first, or delete the group instead.";

interface MemberListProps {
  members: {
    role: "admin" | "member";
    users: Pick<User, "id" | "name" | "profile_image" | "managed_by_user_id">;
  }[];
  /** Pass groupId + currentUserId to enable leave/remove/role controls. Omit for a read-only listing. */
  groupId?: string;
  currentUserId?: string;
  isAdmin?: boolean;
  className?: string;
}

export default function MemberList({
  members,
  groupId,
  currentUserId,
  isAdmin = false,
  className,
}: MemberListProps) {
  const router = useRouter();
  const supabase = createClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = Boolean(groupId && currentUserId);

  async function handleRemove(memberUserId: string, isSelf: boolean) {
    if (!groupId) return;
    setBusyId(memberUserId);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", memberUserId)
      .select();

    setBusyId(null);
    setPendingId(null);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError(LAST_ADMIN_MESSAGE);
      return;
    }

    // Once you leave, RLS hides this group from you — bounce back to the list.
    if (isSelf) {
      router.push("/groups");
    } else {
      router.refresh();
    }
  }

  async function handleToggleRole(memberUserId: string, currentRole: "admin" | "member") {
    if (!groupId) return;
    const nextRole = currentRole === "admin" ? "member" : "admin";
    setBusyId(memberUserId);
    setError(null);

    const { data, error: dbError } = await supabase
      .from("group_members")
      .update({ role: nextRole })
      .eq("group_id", groupId)
      .eq("user_id", memberUserId)
      .select();

    setBusyId(null);

    if (dbError) {
      setError(dbError.message);
      return;
    }
    if (!data || data.length === 0) {
      setError(LAST_ADMIN_MESSAGE);
      return;
    }
    router.refresh();
  }

  return (
    <div className={className}>
      <div className="flex flex-wrap gap-2">
        {members.map((m) => {
          const u = m.users;
          const isSelf = u.id === currentUserId;
          const managedByMe = u.managed_by_user_id === currentUserId;
          const isManaged = Boolean(u.managed_by_user_id);
          const pending = pendingId === u.id;
          const busy = busyId === u.id;

          return (
            <div
              key={u.id}
              className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5"
            >
              {u.profile_image && (
                <img src={u.profile_image} alt={u.name} className="w-5 h-5 rounded-full" />
              )}
              <span className="text-sm text-foreground">{u.name}</span>
              {m.role === "admin" && <Badge variant="secondary">admin</Badge>}
              {isManaged && <Badge variant="outline">managed</Badge>}

              {canManage && isAdmin && !isSelf && !isManaged && !pending && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => handleToggleRole(u.id, m.role)}
                  className="text-xs text-muted-foreground hover:text-foreground ml-1 disabled:opacity-50"
                >
                  {m.role === "admin" ? "Remove admin" : "Make admin"}
                </button>
              )}

              {canManage &&
                (pending ? (
                  <span className="flex items-center gap-1 ml-1">
                    <span className="text-xs text-muted-foreground">
                      {isSelf ? "Leave?" : "Remove?"}
                    </span>
                    <Button
                      variant="destructive"
                      size="xs"
                      disabled={busy}
                      onClick={() => handleRemove(u.id, isSelf)}
                    >
                      Yes
                    </Button>
                    <Button
                      variant="outline"
                      size="xs"
                      disabled={busy}
                      onClick={() => setPendingId(null)}
                    >
                      No
                    </Button>
                  </span>
                ) : isSelf ? (
                  <button
                    type="button"
                    onClick={() => setPendingId(u.id)}
                    className="text-xs text-muted-foreground hover:text-destructive ml-1"
                  >
                    Leave
                  </button>
                ) : (
                  (isAdmin || managedByMe) && (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => setPendingId(u.id)}
                      title={`Remove ${u.name}`}
                      className="-mr-1"
                    >
                      <IconX />
                    </Button>
                  )
                ))}
            </div>
          );
        })}
      </div>

      {error && <p className="text-xs text-destructive mt-2">{error}</p>}
    </div>
  );
}
