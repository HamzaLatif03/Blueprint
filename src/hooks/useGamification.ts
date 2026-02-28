import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

// Level thresholds: level N requires (N-1)*100 XP total
// e.g. Level 2 = 100XP, Level 3 = 300XP, Level 5 = 1000XP, Level 10 = 4500XP
const XP_PER_LEVEL = (level: number) => level * 100;
const levelFromXP = (xp: number): number => {
  let level = 1;
  let needed = 0;
  while (needed + XP_PER_LEVEL(level) <= xp) {
    needed += XP_PER_LEVEL(level);
    level++;
  }
  return level;
};

const xpForCurrentLevel = (xp: number): { current: number; needed: number } => {
  let level = 1;
  let consumed = 0;
  while (consumed + XP_PER_LEVEL(level) <= xp) {
    consumed += XP_PER_LEVEL(level);
    level++;
  }
  return { current: xp - consumed, needed: XP_PER_LEVEL(level) };
};

export const LEVEL_BEZELS: Record<number, { color: string; label: string; emoji: string }> = {
  1: { color: "border-muted-foreground/30", label: "Rookie", emoji: "🌱" },
  2: { color: "border-secondary/50", label: "Starter", emoji: "⚡" },
  3: { color: "border-secondary", label: "Explorer", emoji: "🔥" },
  5: { color: "border-primary", label: "Achiever", emoji: "💎" },
  7: { color: "border-primary shadow-[0_0_8px_hsl(var(--primary)/0.4)]", label: "Pro", emoji: "🏆" },
  10: { color: "border-accent shadow-[0_0_12px_hsl(var(--accent)/0.5)]", label: "Legend", emoji: "👑" },
  15: { color: "border-[hsl(var(--xp-bar))] shadow-[0_0_16px_hsl(var(--xp-bar)/0.6)]", label: "Master", emoji: "⭐" },
  20: { color: "border-destructive shadow-[0_0_20px_hsl(var(--destructive)/0.5)] animate-pulse", label: "Mythic", emoji: "🌟" },
};

export const getBezelForLevel = (level: number) => {
  const keys = Object.keys(LEVEL_BEZELS).map(Number).sort((a, b) => b - a);
  for (const key of keys) {
    if (level >= key) return LEVEL_BEZELS[key];
  }
  return LEVEL_BEZELS[1];
};

export const ACHIEVEMENTS_CONFIG: Record<string, { name: string; description: string; emoji: string }> = {
  first_application: { name: "First Step", description: "Track your first job application", emoji: "📨" },
  five_applications: { name: "Momentum", description: "Track 5 job applications", emoji: "🚀" },
  first_interview_practice: { name: "Stage Ready", description: "Complete your first mock interview", emoji: "🎤" },
  ten_interviews: { name: "Interview Machine", description: "Complete 10 mock interview questions", emoji: "💪" },
  perfect_score: { name: "Flawless", description: "Score 10/10 on an interview answer", emoji: "💯" },
  first_offer: { name: "Offer Secured", description: "Receive your first job offer", emoji: "🎉" },
  postgrad_explorer: { name: "Scholar", description: "Search for postgrad programmes", emoji: "🎓" },
  level_5: { name: "Rising Star", description: "Reach Level 5", emoji: "⭐" },
  level_10: { name: "Legend Status", description: "Reach Level 10", emoji: "👑" },
  streak_7: { name: "On Fire", description: "Maintain a 7-day streak", emoji: "🔥" },
};

export function useGamification() {
  const { user } = useAuth();
  const [xpData, setXpData] = useState({ total_xp: 0, level: 1, streak_days: 0 });
  const [achievements, setAchievements] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [xpPopup, setXpPopup] = useState<{ amount: number; action: string } | null>(null);

  const fetchData = useCallback(async () => {
    if (!user) return;
    const [xpRes, achRes] = await Promise.all([
      supabase.from("user_xp" as any).select("*").eq("user_id", user.id).single(),
      supabase.from("achievements" as any).select("achievement_key").eq("user_id", user.id),
    ]);
    if (xpRes.data) {
      const d = xpRes.data as any;
      setXpData({ total_xp: d.total_xp || 0, level: d.level || 1, streak_days: d.streak_days || 0 });
    } else {
      // Create XP row for existing users
      await supabase.from("user_xp" as any).insert({ user_id: user.id } as any);
      setXpData({ total_xp: 0, level: 1, streak_days: 0 });
    }
    if (achRes.data) {
      setAchievements((achRes.data as any[]).map((a) => a.achievement_key));
    }
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const awardXP = useCallback(async (amount: number, action: string, description?: string) => {
    if (!user || amount <= 0) return;
    
    const newTotal = xpData.total_xp + amount;
    const newLevel = levelFromXP(newTotal);
    const today = new Date().toISOString().split("T")[0];
    const lastDate = xpData.streak_days > 0 ? undefined : today; // simplified
    
    // Optimistic update
    setXpData((prev) => ({
      total_xp: newTotal,
      level: newLevel,
      streak_days: prev.streak_days,
    }));
    
    setXpPopup({ amount, action });
    setTimeout(() => setXpPopup(null), 2500);

    // Persist
    await Promise.all([
      supabase.from("user_xp" as any).update({ 
        total_xp: newTotal, 
        level: newLevel,
        last_activity_date: today,
      } as any).eq("user_id", user.id),
      supabase.from("xp_log" as any).insert({ 
        user_id: user.id, 
        xp_amount: amount, 
        action, 
        description 
      } as any),
    ]);

    // Check level-up
    if (newLevel > xpData.level) {
      const bezel = getBezelForLevel(newLevel);
      toast.success(`🎉 Level Up! You're now Level ${newLevel} — ${bezel.emoji} ${bezel.label}!`);
    }

    // Check level achievements
    if (newLevel >= 5 && !achievements.includes("level_5")) await unlockAchievement("level_5");
    if (newLevel >= 10 && !achievements.includes("level_10")) await unlockAchievement("level_10");
  }, [user, xpData, achievements]);

  const unlockAchievement = useCallback(async (key: string) => {
    if (!user || achievements.includes(key)) return;
    setAchievements((prev) => [...prev, key]);
    const config = ACHIEVEMENTS_CONFIG[key];
    if (config) {
      toast.success(`${config.emoji} Achievement Unlocked: ${config.name}!`, { description: config.description });
    }
    await supabase.from("achievements" as any).insert({ user_id: user.id, achievement_key: key } as any);
  }, [user, achievements]);

  const progress = xpForCurrentLevel(xpData.total_xp);
  const bezel = getBezelForLevel(xpData.level);

  return {
    ...xpData,
    progress,
    bezel,
    achievements,
    loading,
    xpPopup,
    awardXP,
    unlockAchievement,
    refetch: fetchData,
  };
}

export { levelFromXP, xpForCurrentLevel };
