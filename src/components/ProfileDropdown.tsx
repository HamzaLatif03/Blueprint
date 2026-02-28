import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, User, Trophy } from "lucide-react";
import { useGamification, getBezelForLevel } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import { getAvatarByKey } from "@/components/AvatarSelector";

export function ProfileDropdown() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { level, total_xp, bezel } = useGamification();
  const [avatarKey, setAvatarKey] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("avatar_url").eq("user_id", user.id).single().then(({ data }) => {
        if (data) setAvatarKey((data as any).avatar_url);
      });
    }
  }, [user]);

  const avatar = getAvatarByKey(avatarKey);

  const initials = user?.user_metadata?.display_name
    ? user.user_metadata.display_name
        .split(" ")
        .map((n: string) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <div className="relative">
            <Avatar className={`h-9 w-9 cursor-pointer border-[2.5px] ${bezel.color} transition-all`}>
              <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                {avatar.emoji}
              </AvatarFallback>
            </Avatar>
            <span className="absolute -bottom-1 -right-1 text-xs bg-card rounded-full px-1 border border-border font-black text-[10px] leading-tight">
              {level}
            </span>
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <div className="px-3 py-2">
          <p className="text-sm font-medium">{user?.user_metadata?.display_name || "User"}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-xs font-bold text-[hsl(var(--level))]">{bezel.emoji} Lv.{level} {bezel.label}</span>
            <span className="text-[10px] text-muted-foreground">•</span>
            <span className="text-xs font-bold text-[hsl(var(--xp-bar))]">{total_xp} XP</span>
          </div>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/profile")}>
          <User className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
          <LogOut className="mr-2 h-4 w-4" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
