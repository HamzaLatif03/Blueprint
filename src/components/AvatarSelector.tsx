import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Check, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useGamification, getBezelForLevel } from "@/hooks/useGamification";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface AvatarOption {
  key: string;
  emoji: string;
  name: string;
  requiredLevel: number;
  bg: string;
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  { key: "default", emoji: "😊", name: "Friendly", requiredLevel: 1, bg: "from-primary/20 to-primary/5" },
  { key: "rocket", emoji: "🚀", name: "Rocketeer", requiredLevel: 2, bg: "from-blue-500/20 to-blue-500/5" },
  { key: "fire", emoji: "🔥", name: "On Fire", requiredLevel: 3, bg: "from-orange-500/20 to-orange-500/5" },
  { key: "lightning", emoji: "⚡", name: "Electric", requiredLevel: 4, bg: "from-yellow-500/20 to-yellow-500/5" },
  { key: "diamond", emoji: "💎", name: "Diamond", requiredLevel: 5, bg: "from-cyan-500/20 to-cyan-500/5" },
  { key: "crown", emoji: "👑", name: "Royal", requiredLevel: 7, bg: "from-amber-500/20 to-amber-500/5" },
  { key: "star", emoji: "⭐", name: "Superstar", requiredLevel: 8, bg: "from-yellow-400/20 to-yellow-400/5" },
  { key: "trophy", emoji: "🏆", name: "Champion", requiredLevel: 10, bg: "from-amber-600/20 to-amber-600/5" },
  { key: "alien", emoji: "👽", name: "Cosmic", requiredLevel: 12, bg: "from-green-500/20 to-green-500/5" },
  { key: "dragon", emoji: "🐉", name: "Dragon", requiredLevel: 15, bg: "from-red-500/20 to-red-500/5" },
  { key: "phoenix", emoji: "🦅", name: "Phoenix", requiredLevel: 18, bg: "from-orange-600/20 to-orange-600/5" },
  { key: "mythic", emoji: "🌟", name: "Mythic", requiredLevel: 20, bg: "from-purple-500/20 to-purple-500/5" },
];

export function getAvatarByKey(key: string | null): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.key === key) || AVATAR_OPTIONS[0];
}

interface AvatarSelectorProps {
  selectedAvatar: string | null;
  onSelect: (key: string) => void;
}

export function AvatarSelector({ selectedAvatar, onSelect }: AvatarSelectorProps) {
  const { user } = useAuth();
  const { level } = useGamification();

  const handleSelect = async (avatar: AvatarOption) => {
    if (level < avatar.requiredLevel) return;
    onSelect(avatar.key);
    if (user) {
      await supabase.from("profiles").update({ avatar_url: avatar.key } as any).eq("user_id", user.id);
      toast.success(`${avatar.emoji} Avatar changed to ${avatar.name}!`);
    }
  };

  return (
    <Card className="card-glow overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[hsl(var(--xp-bar))] to-[hsl(var(--level))]" />
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-[hsl(var(--xp-bar))]" /> Avatars 🎭
        </CardTitle>
        <CardDescription>Unlock new avatars as you level up! You're Level {level}.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
          {AVATAR_OPTIONS.map((avatar) => {
            const unlocked = level >= avatar.requiredLevel;
            const selected = selectedAvatar === avatar.key || (!selectedAvatar && avatar.key === "default");

            return (
              <motion.button
                key={avatar.key}
                whileHover={unlocked ? { scale: 1.08 } : {}}
                whileTap={unlocked ? { scale: 0.95 } : {}}
                onClick={() => handleSelect(avatar)}
                className={cn(
                  "relative flex flex-col items-center gap-1.5 rounded-xl border-2 p-3 transition-all",
                  unlocked ? "cursor-pointer hover:border-primary/50" : "cursor-not-allowed opacity-50",
                  selected ? "border-primary bg-primary/10 shadow-md" : "border-border"
                )}
              >
                <div className={cn("text-3xl rounded-full w-12 h-12 flex items-center justify-center bg-gradient-to-br", avatar.bg)}>
                  {unlocked ? avatar.emoji : <Lock className="h-5 w-5 text-muted-foreground" />}
                </div>
                <span className="text-[10px] font-bold truncate w-full text-center">
                  {avatar.name}
                </span>
                <span className={cn("text-[9px] font-semibold", unlocked ? "text-accent" : "text-muted-foreground")}>
                  {unlocked ? "Unlocked" : `Lv.${avatar.requiredLevel}`}
                </span>
                {selected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-primary flex items-center justify-center"
                  >
                    <Check className="h-3 w-3 text-primary-foreground" />
                  </motion.div>
                )}
              </motion.button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
