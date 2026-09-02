"use client";

import { useState } from "react";
import { inviteToGroupByEmail } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  groupId: string;
}

export default function InviteByEmailButton({ groupId }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  function close() {
    setOpen(false);
    setEmail("");
    setError(null);
    setSentTo(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    setSentTo(null);

    try {
      const { sentTo: address } = await inviteToGroupByEmail(groupId, email);
      setSentTo(address);
      setEmail("");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <Button size="sm" onClick={() => setOpen(true)}>
        + Invite by email
      </Button>
    );
  }

  return (
    <Card className="w-full mt-3 ring-primary/30">
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="invite-email" className="mb-1">Invite by email</Label>
            <Input
              id="invite-email"
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="friend@example.com"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">
              They&apos;ll get a link that joins them to this group.
            </p>
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}
          {sentTo && (
            <p className="text-xs text-green-600">Invitation sent to {sentTo}.</p>
          )}

          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={close} className="flex-1">
              {sentTo ? "Done" : "Cancel"}
            </Button>
            <Button type="submit" disabled={loading || !email.trim()} className="flex-1">
              {loading ? "Sending…" : sentTo ? "Send another" : "Send invite"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
