"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  groupId: string;
  groupName: string;
}

export default function DeleteGroupButton({ groupId, groupName }: Props) {
  const router = useRouter();
  const supabase = createClient();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  async function handleDelete() {
    setLoading(true);
    setError(null);

    const { error: dbError } = await supabase.rpc("delete_group", { p_group_id: groupId });

    if (dbError) {
      setError(dbError.message);
      setLoading(false);
      return;
    }

    router.push("/groups");
  }

  if (!open) {
    return (
      <Button variant="destructive" size="sm" onClick={() => setOpen(true)}>
        Delete group
      </Button>
    );
  }

  return (
    <Card className="ring-destructive/30">
      <CardContent className="space-y-3">
        <p className="text-sm text-foreground">
          This permanently deletes <strong>{groupName}</strong>{" "}
          and every wishlist, item, and claim shared through it — for every member, not
          just you. This can&apos;t be undone.
        </p>
        <div>
          <Label htmlFor="delete-confirm" className="mb-1">
            Type <strong className="normal-case">{groupName}</strong> to confirm
          </Label>
          <Input
            id="delete-confirm"
            autoFocus
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
          />
        </div>

        {error && <p className="text-xs text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={close} className="flex-1">
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={loading || confirmText !== groupName}
            onClick={handleDelete}
            className="flex-1"
          >
            {loading ? "Deleting…" : "Delete group"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
