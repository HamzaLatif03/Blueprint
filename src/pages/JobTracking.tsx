import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Trash2, ExternalLink, Loader2, Trophy, Zap, Filter, Sparkles, RefreshCw, MapPin, DollarSign, ChevronLeft, ChevronRight, CheckCircle, Search, Tag } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { useGamification } from "@/hooks/useGamification";
import { XPPopup } from "@/components/XPPopup";
import { BACKEND_URL } from "@/config/backend";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const statusConfig: Record<string, { bg: string; emoji: string; label: string }> = {
  applied: { bg: "bg-secondary/10 text-secondary border-secondary/20", emoji: "📨", label: "Applied" },
  interviewing: { bg: "bg-primary/10 text-primary border-primary/20", emoji: "🎤", label: "Interviewing" },
  offered: { bg: "bg-accent/10 text-accent border-accent/20", emoji: "🎉", label: "Offered" },
  accepted: { bg: "bg-accent/15 text-accent border-accent/30", emoji: "✅", label: "Accepted" },
  rejected: { bg: "bg-destructive/10 text-destructive border-destructive/20", emoji: "❌", label: "Rejected" },
};

const categoryColors: Record<string, string> = {
  Finance: "bg-secondary/10 text-secondary border-secondary/20",
  Technology: "bg-primary/10 text-primary border-primary/20",
  Consulting: "bg-accent/10 text-accent border-accent/20",
  Law: "bg-muted text-muted-foreground border-border",
  Other: "bg-muted text-muted-foreground border-border",
};

type JobApp = { id: string; company: string; role: string; status: string; applied_date: string; notes: string | null; url: string | null };
type RecommendedJob = { company: string; role: string; url: string; match_reason: string; category: string; deadline_hint?: string; level: string; location: string; salary: string; logo_url: string };
type SearchedJob = { title: string; company: string; match_score: number; requirements: string[]; why_match: string; url: string };

const JobTracking = () => {
  const { user } = useAuth();
  const { awardXP, unlockAchievement, xpPopup } = useGamification();
  const [apps, setApps] = useState<JobApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied", url: "", notes: "" });
  const [statusFilter, setStatusFilter] = useState("all");
  const [recommendations, setRecommendations] = useState<RecommendedJob[]>([]);
  const [recsLoading, setRecsLoading] = useState(false);

  // Job Search state
  const [searchSkills, setSearchSkills] = useState("");
  const [searchLocation, setSearchLocation] = useState("London");
  const [searchRoleType, setSearchRoleType] = useState("graduate software engineer");
  const [searchResults, setSearchResults] = useState<SearchedJob[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApps((data as unknown as JobApp[]) || []);
    setLoading(false);
  };

  const fetchRecommendations = async () => {
    if (!user) return;
    setRecsLoading(true);

    const [eduRes, workRes, profileRes] = await Promise.all([
      supabase.from("education" as any).select("*").eq("user_id", user.id),
      supabase.from("work_experience" as any).select("*").eq("user_id", user.id),
      supabase.from("profiles").select("bio").eq("user_id", user.id).single(),
    ]);

    const education = eduRes.data || [];
    const workExperience = workRes.data || [];
    const bio = profileRes.data?.bio || "";

    try {
      const res = await fetch(`${BACKEND_URL}/api/recommended-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ education, work_experience: workExperience, bio, cv_text: null }),
      });

      if (!res.ok) throw new Error("Brev backend error");
      const data = await res.json();
      setRecommendations(data.jobs || []);
    } catch (brevErr) {
      console.warn("Brev backend failed, falling back to edge function:", brevErr);
      try {
        const { data, error } = await supabase.functions.invoke("recommended-jobs", {
          body: { education, work_experience: workExperience, bio },
        });
        if (error) throw error;
        setRecommendations(data.jobs || []);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        toast.error("Failed to load recommendations");
      }
    }
    setRecsLoading(false);
  };

  const searchJobs = async () => {
    if (!searchSkills.trim()) return;
    setSearchLoading(true);
    setHasSearched(true);
    try {
      const skills = searchSkills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`${BACKEND_URL}/api/search-jobs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skills,
          location: searchLocation || "London",
          role_type: searchRoleType || "graduate software engineer",
        }),
      });
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();
      setSearchResults(data.jobs || []);
      await awardXP(10, "Job Search", `Searched for ${skills.length} skills`);
    } catch (err) {
      console.warn("Job search failed:", err);
      toast.error("Job search is currently unavailable. Try recommendations instead.");
      setSearchResults([]);
    }
    setSearchLoading(false);
  };

  const addFromSearch = async (job: SearchedJob) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const newApp: JobApp = { id: tempId, company: job.company, role: job.title, status: "applied", applied_date: new Date().toISOString(), notes: job.why_match, url: job.url };
    setApps((prev) => [newApp, ...prev]);
    toast.success(`📨 Applied to ${job.title} at ${job.company}!`);

    const { error } = await supabase.from("job_applications").insert({ company: job.company, role: job.title, status: "applied", url: job.url, notes: job.why_match, user_id: user.id } as any);
    if (error) {
      toast.error("Failed to save — reverting");
      setApps((prev) => prev.filter((a) => a.id !== tempId));
    } else {
      fetchApps();
      await awardXP(15, "Applied via Search", `${job.title} at ${job.company}`);
    }
  };

  useEffect(() => { fetchApps(); }, [user]);

  const addApp = async () => {
    if (!form.company.trim() || !form.role.trim() || !user) return;
    setForm({ company: "", role: "", status: "applied", url: "", notes: "" });
    setDialogOpen(false);
    toast.success("🎉 Application tracked!");

    const { data: inserted, error } = await supabase.from("job_applications").insert({ ...form, user_id: user.id } as any).select().single();
    if (error) {
      toast.error("Failed to save application");
    } else {
      setApps((prev) => [inserted as unknown as JobApp, ...prev]);
      await awardXP(10, "Application Tracked", `${form.role} at ${form.company}`);
      const count = apps.length + 1;
      if (count === 1) await unlockAchievement("first_application");
      if (count >= 5) await unlockAchievement("five_applications");
    }
  };

  const addFromRecommendation = async (job: RecommendedJob) => {
    if (!user) return;
    const tempId = crypto.randomUUID();
    const newApp: JobApp = { id: tempId, company: job.company, role: job.role, status: "applied", applied_date: new Date().toISOString(), notes: job.match_reason, url: job.url };
    setApps((prev) => [newApp, ...prev]);
    toast.success(`📨 Applied to ${job.role} at ${job.company}!`);

    const { error } = await supabase.from("job_applications").insert({ company: job.company, role: job.role, status: "applied", url: job.url, notes: job.match_reason, user_id: user.id } as any);
    if (error) {
      toast.error("Failed to save — reverting");
      setApps((prev) => prev.filter((a) => a.id !== tempId));
    } else {
      fetchApps();
      await awardXP(15, "Applied via Recommendation", `${job.role} at ${job.company}`);
      const count = apps.length + 1;
      if (count === 1) await unlockAchievement("first_application");
      if (count >= 5) await unlockAchievement("five_applications");
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dir: number) => {
    scrollContainerRef.current?.scrollBy({ left: dir * 320, behavior: "smooth" });
  };

  const updateStatus = async (id: string, status: string) => {
    setApps((prev) => prev.map((a) => a.id === id ? { ...a, status } : a));
    const emoji = statusConfig[status]?.emoji || "";
    toast.success(`${emoji} Status updated!`);
    await supabase.from("job_applications").update({ status } as any).eq("id", id);
    if (status === "interviewing") await awardXP(15, "Interview Stage", "Moved to interviewing");
    if (status === "offered") { await awardXP(25, "Offer Received! 🎉"); await unlockAchievement("first_offer"); }
    if (status === "accepted") await awardXP(50, "Offer Accepted! 🎊");
  };

  const deleteApp = async (id: string) => {
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
      <XPPopup xpPopup={xpPopup} />
      <motion.div variants={fadeUp} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold flex items-center gap-3">
            <motion.div whileHover={{ rotate: 15 }} className="p-2.5 rounded-xl bg-gradient-to-br from-secondary to-secondary/60 text-secondary-foreground">
              <Briefcase className="h-6 w-6" />
            </motion.div>
            Job Tracking
            <span className="text-2xl">💼</span>
          </h1>
          <p className="mt-2 text-muted-foreground">Track all your applications in one place.</p>
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

      {/* Job Search Section */}
      <motion.div variants={fadeUp} className="mb-6">
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-accent" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Search className="h-5 w-5 text-primary" /> Search Jobs by Skills 🔍
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-2">
                <Label className="font-semibold flex items-center gap-1.5"><Tag className="h-3.5 w-3.5" /> Skills *</Label>
                <Input
                  placeholder="e.g. Python, React, SQL"
                  value={searchSkills}
                  onChange={(e) => setSearchSkills(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" /> Location</Label>
                <Input
                  placeholder="e.g. London"
                  value={searchLocation}
                  onChange={(e) => setSearchLocation(e.target.value)}
                  className="h-11"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-semibold flex items-center gap-1.5"><Briefcase className="h-3.5 w-3.5" /> Role Type</Label>
                <Input
                  placeholder="e.g. graduate software engineer"
                  value={searchRoleType}
                  onChange={(e) => setSearchRoleType(e.target.value)}
                  className="h-11"
                />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                onClick={searchJobs}
                disabled={!searchSkills.trim() || searchLoading}
                className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground h-11 font-bold"
                size="lg"
              >
                {searchLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Search Jobs
              </Button>
            </motion.div>

            {/* Search Loading */}
            {searchLoading && (
              <div className="flex flex-col items-center py-8 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Searching live job listings... (30–45s)</p>
              </div>
            )}

            {/* Search Results */}
            <AnimatePresence>
              {hasSearched && !searchLoading && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                  {searchResults.length === 0 ? (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground font-medium">No jobs found. Try different skills or location.</p>
                    </div>
                  ) : (
                    <div className="space-y-3 mt-2">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-primary" />
                        <span className="text-sm font-bold">{searchResults.length} jobs found — sorted by match!</span>
                      </div>
                      {searchResults.map((job, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}>
                          <Card className="card-glow card-glow-hover hover:border-primary/30 transition-all overflow-hidden relative">
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${job.match_score >= 80 ? "bg-accent" : job.match_score >= 60 ? "bg-primary" : "bg-secondary"}`} />
                            <CardContent className="py-4 pl-5 flex flex-col sm:flex-row sm:items-center gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <h3 className="font-bold text-foreground">{job.title}</h3>
                                  <span className="text-muted-foreground text-sm">@</span>
                                  <span className="font-semibold text-foreground">{job.company}</span>
                                  <Badge variant="outline" className="text-[10px] font-bold">{job.match_score}% match</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">{job.why_match}</p>
                                {job.requirements.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {job.requirements.slice(0, 4).map((req, ri) => (
                                      <Badge key={ri} variant="secondary" className="text-[9px]">{req}</Badge>
                                    ))}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                  <Button size="sm" className="text-xs font-bold gap-1 bg-primary hover:bg-primary/90 text-primary-foreground h-8" onClick={() => addFromSearch(job)}>
                                    <Plus className="h-3.5 w-3.5" /> Track
                                  </Button>
                                </motion.div>
                                {job.url && (
                                  <a href={job.url} target="_blank" rel="noopener noreferrer">
                                    <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1">
                                      <ExternalLink className="h-3.5 w-3.5" /> Apply
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
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
          <AnimatePresence initial={false}>
            {filteredApps.map((app) => {
              const cfg = statusConfig[app.status] || statusConfig.applied;
              return (
                <motion.div
                  key={app.id}
                  layout
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto", transition: { height: { duration: 0.3, ease: [0.4, 0, 0.2, 1] }, opacity: { duration: 0.2, delay: 0.15 } } }}
                  exit={{ opacity: 0, height: 0, transition: { opacity: { duration: 0.15 }, height: { duration: 0.25, delay: 0.1, ease: [0.4, 0, 0.2, 1] } } }}
                  transition={{ layout: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }}
                  style={{ overflow: "hidden" }}
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

      {/* Recommended Jobs Carousel */}
      <motion.div variants={fadeUp} className="mt-10">
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-accent" />
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="h-5 w-5 text-primary" /> Recommended For You ✨
            </CardTitle>
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button variant="outline" size="sm" onClick={fetchRecommendations} disabled={recsLoading} className="gap-2 font-bold">
                {recsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                {recommendations.length === 0 ? "Get Recommendations" : "Refresh"}
              </Button>
            </motion.div>
          </CardHeader>
          <CardContent>
            {recsLoading ? (
              <div className="flex flex-col items-center py-10 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground font-medium">Finding personalized matches... (25–40s)</p>
              </div>
            ) : recommendations.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="h-12 w-12 text-muted-foreground/20 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">Click "Get Recommendations" to see personalised job suggestions based on your profile.</p>
                <p className="text-xs text-muted-foreground mt-1">Tip: Fill out your profile with education & experience for better matches!</p>
              </div>
            ) : recommendations.filter((job) => !apps.some((a) => a.company.toLowerCase() === job.company.toLowerCase() && a.role.toLowerCase() === job.role.toLowerCase())).length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-accent/30 mx-auto mb-3" />
                <p className="text-muted-foreground font-medium">You've applied to all recommended jobs! 🎉</p>
                <p className="text-xs text-muted-foreground mt-1">Hit "Refresh" to get new recommendations.</p>
              </div>
            ) : (
              <div className="relative">
                <button onClick={() => scrollBy(-1)} className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-3 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronLeft className="h-4 w-4 text-foreground" />
                </button>
                <button onClick={() => scrollBy(1)} className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-3 z-10 h-8 w-8 rounded-full bg-card border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors">
                  <ChevronRight className="h-4 w-4 text-foreground" />
                </button>

                <div ref={scrollContainerRef} className="flex gap-4 overflow-x-auto pb-2 scroll-smooth snap-x snap-mandatory" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
                  {recommendations.filter((job) => !apps.some((a) => a.company.toLowerCase() === job.company.toLowerCase() && a.role.toLowerCase() === job.role.toLowerCase())).map((job, i) => {
                    return (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: i * 0.06 }}
                        className="snap-start shrink-0 w-[280px]"
                      >
                        <Card className="card-glow card-glow-hover hover:border-primary/30 transition-all h-full flex flex-col overflow-hidden">
                          <div className={`h-1 bg-gradient-to-r ${
                            job.category === "Technology" ? "from-primary to-primary/60" :
                            job.category === "Finance" ? "from-secondary to-secondary/60" :
                            job.category === "Consulting" ? "from-accent to-accent/60" :
                            "from-muted-foreground/30 to-muted-foreground/10"
                          }`} />
                          <CardContent className="py-4 flex flex-col gap-3 flex-1">
                            <div className="flex items-center gap-3">
                              <img
                                src={job.logo_url}
                                alt={job.company}
                                className="h-10 w-10 rounded-lg object-contain bg-muted p-1 border border-border"
                                onError={(e) => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(job.company)}&background=random&size=40`; }}
                              />
                              <div className="min-w-0">
                                <h4 className="font-bold text-foreground text-sm leading-tight truncate">{job.company}</h4>
                                <Badge variant="outline" className={`text-[9px] mt-0.5 ${categoryColors[job.category] || categoryColors.Other}`}>
                                  {job.category}
                                </Badge>
                              </div>
                            </div>

                            <h3 className="font-extrabold text-foreground leading-snug text-[15px]">{job.role}</h3>

                            <div className="space-y-1.5">
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Briefcase className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-semibold">{job.level}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5 shrink-0" />
                                <span>{job.location}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <DollarSign className="h-3.5 w-3.5 shrink-0" />
                                <span className="font-semibold">{job.salary}</span>
                              </div>
                            </div>

                            <p className="text-[11px] text-muted-foreground flex-1 leading-relaxed">{job.match_reason}</p>

                            <div className="flex gap-2 mt-auto pt-2">
                              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} className="flex-1">
                                <Button size="sm" className="w-full h-9 text-xs font-bold gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground" onClick={() => addFromRecommendation(job)}>
                                  <Plus className="h-3.5 w-3.5" /> Applied +15 XP
                                </Button>
                              </motion.div>
                              <a href={job.url} target="_blank" rel="noopener noreferrer">
                                <Button variant="outline" size="sm" className="h-9 text-xs font-bold gap-1">
                                  <ExternalLink className="h-3.5 w-3.5" />
                                </Button>
                              </a>
                            </div>
                          </CardContent>
                        </Card>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default JobTracking;
