import { motion } from "framer-motion";
import { Mic, GraduationCap, Briefcase, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0 } };

const cards = [
  { title: "Mock Interviews", desc: "Practice with AI feedback and scoring", icon: Mic, color: "from-primary/20 to-primary/5 hover:from-primary/30", iconBg: "bg-primary/15 text-primary", href: "/mock-interviews" },
  { title: "Postgrad", desc: "Find PhD & Masters programmes matched to you", icon: GraduationCap, color: "from-accent/20 to-accent/5 hover:from-accent/30", iconBg: "bg-accent/15 text-accent", href: "/postgrad" },
  { title: "Job Tracking", desc: "Track all your applications in one place", icon: Briefcase, color: "from-secondary/20 to-secondary/5 hover:from-secondary/30", iconBg: "bg-secondary/15 text-secondary", href: "/job-tracking" },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <motion.div className="max-w-4xl mx-auto" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.12 } } }}>
      <motion.div variants={fadeUp} className="mb-10">
        <div className="flex items-center gap-2 mb-1"><Sparkles className="h-5 w-5 text-primary" /><span className="text-sm font-medium text-primary">Blueprint</span></div>
        <h1 className="text-4xl font-bold tracking-tight">Welcome back{user?.user_metadata?.display_name ? `, ${user.user_metadata.display_name}` : ""}</h1>
        <p className="text-lg text-muted-foreground mt-2">Your career toolkit — practice, discover, and track.</p>
      </motion.div>

      <div className="grid gap-5 sm:grid-cols-3">
        {cards.map((item) => (
          <motion.div key={item.title} variants={fadeUp}>
            <Link to={item.href} className={`block rounded-2xl p-6 bg-gradient-to-br ${item.color} transition-all hover:shadow-lg hover:-translate-y-1 group`}>
              <div className={`h-11 w-11 rounded-xl ${item.iconBg} flex items-center justify-center mb-4`}>
                <item.icon className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-lg text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{item.desc}</p>
              <div className="mt-4 flex items-center gap-1 text-sm font-medium text-foreground/70 group-hover:text-foreground transition-colors">
                Get started <ArrowRight className="h-3.5 w-3.5 group-hover:translate-x-1 transition-transform" />
              </div>
            </Link>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default Dashboard;
