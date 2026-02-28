import { motion } from "framer-motion";
import { Zap, Trophy, Flame, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useGamification, getBezelForLevel, ACHIEVEMENTS_CONFIG } from "@/hooks/useGamification";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface XPBarProps {
  compact?: boolean;
}

export function XPBar({ compact = false }: XPBarProps) {
  const { total_xp, level, streak_days, progress, bezel, achievements, loading } = useGamification();

  if (loading) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-bold">
          <Zap className="h-3.5 w-3.5 text-[hsl(var(--xp-bar))]" />
          {total_xp}
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-bold">
          <Trophy className="h-3.5 w-3.5 text-[hsl(var(--level))]" />
          Lv.{level}
        </div>
        {streak_days > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass text-xs font-bold">
            <Flame className="h-3.5 w-3.5 text-[hsl(var(--streak))]" />
            {streak_days}
          </div>
        )}
      </div>
    );
  }

  return (
    <Card className="card-glow overflow-hidden relative">
      <div className="absolute top-0 left-0 right-0 h-1 xp-gradient" />
      <CardContent className="py-5">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <motion.div
              className={`h-12 w-12 rounded-full border-[3px] ${bezel.color} flex items-center justify-center text-xl font-black bg-card`}
              whileHover={{ scale: 1.1 }}
            >
              {bezel.emoji}
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg">Level {level}</span>
                <Badge variant="outline" className="text-[10px] font-bold">{bezel.label}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">{total_xp} total XP</p>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex items-center gap-1.5 px-3 py-2 rounded-xl glass text-sm font-bold">
              <Flame className="h-4 w-4 text-[hsl(var(--streak))]" />
              {streak_days} day{streak_days !== 1 ? "s" : ""}
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 font-bold">
                  <Trophy className="h-4 w-4" /> {achievements.length}
                  <ChevronRight className="h-3 w-3" />
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">🏆 Achievements</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 mt-2 max-h-[60vh] overflow-y-auto">
                  {Object.entries(ACHIEVEMENTS_CONFIG).map(([key, cfg]) => {
                    const unlocked = achievements.includes(key);
                    return (
                      <div key={key} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${unlocked ? "border-primary/30 bg-primary/5" : "border-border opacity-40"}`}>
                        <span className="text-2xl">{cfg.emoji}</span>
                        <div className="flex-1">
                          <p className="font-bold text-sm">{cfg.name}</p>
                          <p className="text-xs text-muted-foreground">{cfg.description}</p>
                        </div>
                        {unlocked && <Badge className="text-[10px] bg-primary text-primary-foreground">✓</Badge>}
                      </div>
                    );
                  })}
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        {/* XP Progress Bar */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground font-medium">
            <span>Level {level} → {level + 1}</span>
            <span>{progress.current} / {progress.needed} XP</span>
          </div>
          <div className="h-3 rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full xp-gradient"
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, (progress.current / progress.needed) * 100)}%` }}
              transition={{ duration: 0.8 }}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
