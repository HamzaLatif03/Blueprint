import { motion } from "framer-motion";
import { Mic, GraduationCap, Briefcase, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { XPBar } from "@/components/XPBar";
import { XPPopup } from "@/components/XPPopup";
import { useGamification } from "@/hooks/useGamification";

const fadeUp = { hidden: { opacity: 0, y: 30 }, visible: { opacity: 1, y: 0, transition: { duration: 0.5 } } };
const stagger = { visible: { transition: { staggerChildren: 0.15 } } };

const cards = [
  { title: "Mock Interviews", desc: "Practice with AI feedback and earn XP", icon: Mic, gradient: "from-primary to-primary/60", iconBg: "bg-primary/15 text-primary", href: "/mock-interviews", emoji: "🎤" },
  { title: "Postgrad", desc: "Find your perfect programme match", icon: GraduationCap, gradient: "from-accent to-accent/60", iconBg: "bg-accent/15 text-accent", href: "/postgrad", emoji: "🎓" },
  { title: "Job Tracking", desc: "Track applications like a pro", icon: Briefcase, gradient: "from-secondary to-secondary/60", iconBg: "bg-secondary/15 text-secondary", href: "/job-tracking", emoji: "💼" },
];

const Dashboard = () => {
  const { user } = useAuth();
  const { xpPopup } = useGamification();

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
      <XPPopup xpPopup={xpPopup} />
      
      {/* Hero Section */}
      <motion.div variants={fadeUp} className="mb-8 relative">
        <div className="absolute -top-4 -left-4 w-20 h-20 rounded-full bg-primary/10 blur-2xl animate-float" />
        <div className="absolute top-0 right-10 w-16 h-16 rounded-full bg-accent/10 blur-xl animate-float" style={{ animationDelay: "1s" }} />
        
        <div className="flex items-center gap-3 mb-2">
          <motion.div whileHover={{ rotate: 360 }} transition={{ duration: 0.5 }} className="p-2 rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground">
            <Sparkles className="h-5 w-5" />
          </motion.div>
          <span className="text-sm font-bold uppercase tracking-widest gradient-text">Blueprint</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">
          Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""} 
          <motion.span 
            className="inline-block ml-2" 
            animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }} 
            transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
          >
            👋
          </motion.span>
        </h1>
        <p className="text-lg text-muted-foreground mt-3">Your career toolkit — practice, discover, and track.</p>
      </motion.div>

      {/* XP Bar */}
      <motion.div variants={fadeUp} className="mb-8">
        <XPBar />
      </motion.div>

      {/* Feature Cards */}
      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((item) => (
          <motion.div key={item.title} variants={fadeUp}>
            <Link to={item.href}>
              <motion.div 
                whileHover={{ y: -8, scale: 1.02 }} 
                whileTap={{ scale: 0.98 }}
                className="relative rounded-2xl p-6 bg-card border border-border/50 hover:border-primary/30 transition-colors overflow-hidden card-glow card-glow-hover group cursor-pointer"
              >
                <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${item.gradient}`} />
                <div className="flex items-center justify-between mb-4">
                  <motion.div 
                    className={`h-12 w-12 rounded-xl ${item.iconBg} flex items-center justify-center`}
                    whileHover={{ rotate: 12 }}
                  >
                    <item.icon className="h-6 w-6" />
                  </motion.div>
                  <span className="text-2xl">{item.emoji}</span>
                </div>
                <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
                <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-primary group-hover:gap-2 transition-all">
                  Let's go <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </motion.div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Dashboard;
