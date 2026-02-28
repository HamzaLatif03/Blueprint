import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Trash2, ExternalLink, Loader2, Trophy, Zap, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const statusConfig: Record<string, { bg: string; emoji: string; label: string }> = {
  applied: { bg: "bg-secondary/10 text-secondary border-secondary/20", emoji: "📨", label: "Applied" },
  interviewing: { bg: "bg-primary/10 text-primary border-primary/20", emoji: "🎤", label: "Interviewing" },
  offered: { bg: "bg-accent/10 text-accent border-accent/20", emoji: "🎉", label: "Offered" },
  accepted: { bg: "bg-accent/15 text-accent border-accent/30", emoji: "✅", label: "Accepted" },
  rejected: { bg: "bg-destructive/10 text-destructive border-destructive/20", emoji: "❌", label: "Rejected" },
};

type JobApp = { id: string; company: string; role: string; status: string; applied_date: string; notes: string | null; url: string | null };

const JobTracking = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<JobApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied", url: "", notes: "" });
  const [statusFilter, setStatusFilter] = useState("all");

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApps((data as unknown as JobApp[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const addApp = async () => {
    if (!form.company.trim() || !form.role.trim() || !user) return;
    // Optimistic add
    const tempId = crypto.randomUUID();
    const newApp: JobApp = { id: tempId, company: form.company, role: form.role, status: form.status, applied_date: new Date().toISOString(), notes: form.notes || null, url: form.url || null };
    setApps((prev) => [newApp, ...prev]);
    setForm({ company: "", role: "", status: "applied", url: "", notes: "" });
    setDialogOpen(false);
    toast.success("🎉 Application tracked!");

    const { error } = await supabase.from("job_applications").insert({ ...form, user_id: user.id } as any);
    if (error) {
      toast.error("Failed to save — reverting");
      setApps((prev) => prev.filter((a) => a.id !== tempId));
    } else {
      // Replace temp with real data
      fetchApps();
    }
  };

  const updateStatus = async (id: string, status: string) => {
    // Optimistic update
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    const emoji = statusConfig[status]?.emoji || "";
    toast.success(`${emoji} Status updated!`);
    await supabase.from("job_applications").update({ status } as any).eq("id", id);
  };

  const deleteApp = async (id: string) => {
    // Optimistic delete
    const prev = apps;
    setApps((a) => a.filter((x) => x.id !== id));
    toast.success("Removed");
    const { error } = await supabase.from("job_applications").delete().eq("id", id);
    if (error) {
      toast.error("Failed to delete");
      setApps(prev);
    }
  };

  const filteredApps = useMemo(() => {
    if (statusFilter === "all") return apps;
    return apps.filter((a) => a.status === statusFilter);
  }, [apps, statusFilter]);

  const stats = {
    total: apps.length,
    interviewing: apps.filter((a) => a.status === "interviewing").length,
    offered: apps.filter((a) => a.status === "offered" || a.status === "accepted").length,
  };

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <motion.div whileHover={{ rotate: 15 }} className="p-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 text-secondary-foreground">
              <Briefcase className="h-6 w-6" />
            </motion.div>
            Job Tracking
            <span className="text-2xl">💼</span>
          </h1>
          <p className="mt-2 text-muted-foreground">
            Track all your applications in one place.{" "}
            <a href="https://the-trackr.com/" target="_blank" rel="noopener noreferrer" className="text-secondary hover:underline font-medium inline-flex items-center gap-1">
              Browse Trackr <ExternalLink className="h-3 w-3" />
            </a>
          </p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground h-11 font-bold" size="lg">
                <Plus className="h-5 w-5" /> Add Application
              </Button>
            </motion.div>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="text-xl">🆕 New Application</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label className="font-semibold">Company *</Label><Input placeholder="e.g. Google" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} className="h-11" /></div>
                <div className="space-y-2"><Label className="font-semibold">Role *</Label><Input placeholder="e.g. SWE Intern" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className="h-11" /></div>
              </div>
              <div className="space-y-2"><Label className="font-semibold">Link (optional)</Label><Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
              <div className="space-y-2"><Label className="font-semibold">Notes</Label><Input placeholder="Any notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                <Button onClick={addApp} disabled={!form.company.trim() || !form.role.trim()} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold h-11">
                  Track It! 🚀
                </Button>
              </motion.div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {/* Stats */}
      {apps.length > 0 && (
        <motion.div variants={fadeUp} className="grid grid-cols-3 gap-3 mb-6">
          {[
            { label: "Total", value: stats.total, icon: <Briefcase className="h-4 w-4" />, color: "text-secondary" },
            { label: "Interviewing", value: stats.interviewing, icon: <Zap className="h-4 w-4" />, color: "text-primary" },
            { label: "Offers", value: stats.offered, icon: <Trophy className="h-4 w-4" />, color: "text-accent" },
          ].map((stat) => (
            <Card key={stat.label} className="card-glow">
              <CardContent className="py-4 flex items-center gap-3">
                <div className={stat.color}>{stat.icon}</div>
                <div>
                  <p className={`text-2xl font-black ${stat.color}`}>{stat.value}</p>
                  <p className="text-xs text-muted-foreground font-medium">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      )}

      {/* Status Filter */}
      {apps.length > 0 && (
        <motion.div variants={fadeUp} className="mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-semibold text-muted-foreground">Filter by status</span>
          </div>
          <ToggleGroup type="single" value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)} className="justify-start gap-0 rounded-xl border border-border overflow-hidden p-0.5 bg-muted flex-wrap">
            <ToggleGroupItem value="all" className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:shadow-sm transition-all">
              All ({apps.length})
            </ToggleGroupItem>
            {Object.entries(statusConfig).map(([key, val]) => {
              const count = apps.filter((a) => a.status === key).length;
              return (
                <ToggleGroupItem key={key} value={key} className="rounded-lg px-4 py-2 text-sm font-semibold data-[state=on]:bg-secondary data-[state=on]:text-secondary-foreground data-[state=on]:shadow-sm transition-all">
                  {val.emoji} {val.label} ({count})
                </ToggleGroupItem>
              );
            })}
          </ToggleGroup>
        </motion.div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-secondary" /></div>
      ) : apps.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="card-glow border-2 border-dashed border-secondary/20">
            <CardContent className="py-14 text-center">
              <motion.div animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                <Briefcase className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              </motion.div>
              <p className="text-lg font-semibold text-muted-foreground mb-1">No applications yet</p>
              <p className="text-sm text-muted-foreground">Start tracking your first one! 🚀</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : filteredApps.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="card-glow"><CardContent className="py-10 text-center text-muted-foreground">
            <p className="text-4xl mb-3">{statusConfig[statusFilter]?.emoji || "🔍"}</p>
            <p className="font-medium">No {statusConfig[statusFilter]?.label?.toLowerCase() || ""} applications.</p>
          </CardContent></Card>
        </motion.div>
      ) : (
        <motion.div className="space-y-3">
          <AnimatePresence>
            {filteredApps.map((app, i) => {
              const cfg = statusConfig[app.status] || statusConfig.applied;
              return (
                <motion.div 
                  key={app.id} 
                  initial={{ opacity: 0, x: -20 }} 
                  animate={{ opacity: 1, x: 0 }} 
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ delay: i * 0.04 }} 
                  layout
                >
                  <motion.div whileHover={{ x: 4 }}>
                    <Card className="card-glow card-glow-hover hover:border-secondary/30 transition-all group overflow-hidden relative">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${app.status === "offered" || app.status === "accepted" ? "bg-accent" : app.status === "interviewing" ? "bg-primary" : app.status === "rejected" ? "bg-destructive" : "bg-secondary"}`} />
                      <CardContent className="py-4 pl-5 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="text-xl">{cfg.emoji}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-foreground">{app.role}</h3>
                              <span className="text-muted-foreground text-sm">@</span>
                              <span className="font-semibold text-foreground">{app.company}</span>
                              {app.url && (
                                <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary/80 transition-colors">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </a>
                              )}
                            </div>
                            {app.notes && <p className="text-sm text-muted-foreground mt-0.5 truncate max-w-md">{app.notes}</p>}
                            <p className="text-xs text-muted-foreground mt-1">{app.applied_date ? new Date(app.applied_date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : ""}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                            <SelectTrigger className={`w-40 text-xs font-bold border rounded-lg ${cfg.bg}`}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.entries(statusConfig).map(([key, val]) => (
                                <SelectItem key={key} value={key}>{val.emoji} {val.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-all" onClick={() => deleteApp(app.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </motion.div>
      )}
    </motion.div>
  );
};

export default JobTracking;
