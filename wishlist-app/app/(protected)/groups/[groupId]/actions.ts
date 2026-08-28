"use server";

import { createClient } from "@/lib/supabase/server";
import { headers } from "next/headers";
import { Resend } from "resend";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Where invite links should point — explicit config first, request headers as fallback. */
async function siteOrigin(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/$/, "");
  if (configured) return configured;

  const h = await headers();
  const origin = h.get("origin");
  if (origin) return origin;

  const host = h.get("host");
  return host ? `https://${host}` : "";
}

export async function inviteToGroupByEmail(
  groupId: string,
  email: string
): Promise<{ sentTo: string }> {
  const recipient = email.trim().toLowerCase();
  if (!EMAIL_RE.test(recipient)) {
    throw new Error("That doesn't look like a valid email address.");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // RLS only lets members read their own membership rows, so this doubles as
  // the authorization check: no membership, no invite.
  const { data: membership } = await supabase
    .from("group_members")
    .select("groups(id, name, invite_code)")
    .eq("group_id", groupId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) throw new Error("You're not a member of this group.");

  const group = membership.groups as unknown as {
    id: string;
    name: string;
    invite_code: string;
  };

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Email sending isn't configured — set RESEND_API_KEY to send invitations."
    );
  }

  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();

  const inviterName = profile?.name?.trim() || "Someone";
  const joinUrl = `${await siteOrigin()}/groups/join?code=${group.invite_code}`;

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL || "Wishlist <onboarding@resend.dev>",
    to: recipient,
    subject: `${inviterName} invited you to "${group.name}" on Wishlist`,
    text: [
      `${inviterName} invited you to join the group "${group.name}" on Wishlist.`,
      "",
      `Join here: ${joinUrl}`,
      "",
      `Or enter this invite code after signing in: ${group.invite_code}`,
    ].join("\n"),
    html: inviteHtml({ inviterName, groupName: group.name, joinUrl, inviteCode: group.invite_code }),
  });

  if (error) {
    throw new Error(error.message || "Failed to send the invitation.");
  }

  return { sentTo: recipient };
}

function inviteHtml({
  inviterName,
  groupName,
  joinUrl,
  inviteCode,
}: {
  inviterName: string;
  groupName: string;
  joinUrl: string;
  inviteCode: string;
}): string {
  return `
<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;max-width:480px;margin:0 auto;padding:32px 24px;color:#374151">
  <div style="font-size:40px;text-align:center">&#127873;</div>
  <h1 style="font-size:22px;font-weight:700;color:#111827;text-align:center;margin:16px 0 8px">
    ${escapeHtml(inviterName)} invited you to a group
  </h1>
  <p style="text-align:center;color:#6b7280;margin:0 0 28px">
    Join <strong>${escapeHtml(groupName)}</strong> on Wishlist to share what you want &mdash; and help pick gifts for everyone else.
  </p>
  <div style="text-align:center;margin-bottom:28px">
    <a href="${joinUrl}" style="display:inline-block;background:#ef4444;color:#ffffff;text-decoration:none;font-weight:600;padding:14px 28px;border-radius:12px">
      Join the group
    </a>
  </div>
  <p style="font-size:13px;color:#9ca3af;text-align:center;margin:0">
    Or sign in and enter this invite code:
    <span style="font-family:monospace;font-weight:700;color:#374151">${escapeHtml(inviteCode)}</span>
  </p>
</div>`.trim();
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}
