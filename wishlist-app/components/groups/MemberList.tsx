import type { User } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface MemberListProps {
  members: { role: "admin" | "member"; users: Pick<User, "id" | "name" | "profile_image"> }[];
  className?: string;
}

export default function MemberList({ members, className }: MemberListProps) {
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {members.map((m) => {
        const u = m.users;
        return (
          <div key={u.id} className="flex items-center gap-2 bg-card border border-border rounded-full px-3 py-1.5">
            {u.profile_image && (
              <img src={u.profile_image} alt={u.name} className="w-5 h-5 rounded-full" />
            )}
            <span className="text-sm text-foreground">{u.name}</span>
            {m.role === "admin" && <Badge variant="secondary">admin</Badge>}
          </div>
        );
      })}
    </div>
  );
}
