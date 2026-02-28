import { motion, AnimatePresence } from "framer-motion";
import { Zap } from "lucide-react";

interface XPPopupProps {
  xpPopup: { amount: number; action: string } | null;
}

export function XPPopup({ xpPopup }: XPPopupProps) {
  return (
    <AnimatePresence>
      {xpPopup && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.8 }}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-5 py-3 rounded-2xl glass border-2 border-[hsl(var(--xp-bar))] shadow-[0_0_20px_hsl(var(--xp-bar)/0.3)]"
        >
          <motion.div animate={{ rotate: [0, 15, -15, 0] }} transition={{ duration: 0.5 }}>
            <Zap className="h-5 w-5 text-[hsl(var(--xp-bar))]" />
          </motion.div>
          <span className="font-black text-lg text-[hsl(var(--xp-bar))]">+{xpPopup.amount} XP</span>
          <span className="text-sm text-muted-foreground font-medium">{xpPopup.action}</span>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
