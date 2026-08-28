"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinGroup } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  /** Prefilled from an invite link (?code=…) */
  initialCode?: string;
}

export default function JoinGroupForm({ initialCode = "" }: Props) {
  const router = useRouter();
  const [code, setCode] = useState(initialCode);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const { groupId } = await joinGroup(code);
      router.push(`/groups/${groupId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="invite-code" className="mb-1">Invite Code *</Label>
            <Input
              id="invite-code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. a1b2c3d4"
              required
              className="font-mono"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {initialCode
                ? "From your invitation — just hit Join Group."
                : "Ask a group admin for the 8-character invite code."}
            </p>
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => router.back()} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !code.trim()} className="flex-1">
              {loading ? "Joining…" : "Join Group"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
