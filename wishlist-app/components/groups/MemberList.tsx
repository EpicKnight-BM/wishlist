"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface MemberListProps {
  members: { role: "admin" | "member"; users: Pick<User, "id" | "name" | "profile_image"> }[];
  /** Pass groupId + currentUserId to enable leave/remove controls. Omit for a read-only listing. */
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
  const [loading, setLoading] = useState(false);
  const canManage = Boolean(groupId && currentUserId);

  async function handleRemove(memberUserId: string, isSelf: boolean) {
    if (!groupId) return;
    setLoading(true);
    await supabase
      .from("group_members")
      .delete()
      .eq("group_id", groupId)
      .eq("user_id", memberUserId);
    setLoading(false);
    setPendingId(null);

    // Once you leave, RLS hides this group from you — bounce back to the list.
    if (isSelf) {
      router.push("/groups");
    } else {
      router.refresh();
    }
  }

  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {members.map((m) => {
        const u = m.users;
        const isSelf = u.id === currentUserId;
        const pending = pendingId === u.id;

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

            {canManage &&
              (pending ? (
                <span className="flex items-center gap-1 ml-1">
                  <span className="text-xs text-muted-foreground">
                    {isSelf ? "Leave?" : "Remove?"}
                  </span>
                  <Button
                    variant="destructive"
                    size="xs"
                    disabled={loading}
                    onClick={() => handleRemove(u.id, isSelf)}
                  >
                    Yes
                  </Button>
                  <Button
                    variant="outline"
                    size="xs"
                    disabled={loading}
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
                isAdmin && (
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
  );
}
