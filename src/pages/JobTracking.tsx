import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Briefcase, Plus, Trash2, ExternalLink, Loader2, X } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const statusColors: Record<string, string> = {
  applied: "bg-secondary/15 text-secondary border-secondary/30",
  interviewing: "bg-primary/15 text-primary border-primary/30",
  offered: "bg-accent/15 text-accent border-accent/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  accepted: "bg-accent/20 text-accent border-accent/40",
};

type JobApp = { id: string; company: string; role: string; status: string; applied_date: string; notes: string | null; url: string | null };

const JobTracking = () => {
  const { user } = useAuth();
  const [apps, setApps] = useState<JobApp[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ company: "", role: "", status: "applied", url: "", notes: "" });

  const fetchApps = async () => {
    if (!user) return;
    const { data } = await supabase.from("job_applications").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
    setApps((data as unknown as JobApp[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchApps(); }, [user]);

  const addApp = async () => {
    if (!form.company.trim() || !form.role.trim() || !user) return;
    const { error } = await supabase.from("job_applications").insert({ ...form, user_id: user.id } as any);
    if (error) { toast.error("Failed to add"); return; }
    toast.success("Application added!");
    setForm({ company: "", role: "", status: "applied", url: "", notes: "" });
    setDialogOpen(false);
    fetchApps();
  };

  const updateStatus = async (id: string, status: string) => {
    await supabase.from("job_applications").update({ status } as any).eq("id", id);
    fetchApps();
  };

  const deleteApp = async (id: string) => {
    await supabase.from("job_applications").delete().eq("id", id);
    toast.success("Removed");
    fetchApps();
  };

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
      <motion.div variants={fadeUp} className="mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 rounded-xl bg-secondary/10"><Briefcase className="h-7 w-7 text-secondary" /></div>
            Job Tracking
          </h1>
          <p className="mt-2 text-muted-foreground">Track all your applications in one place.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 bg-secondary hover:bg-secondary/90 text-secondary-foreground" size="lg">
              <Plus className="h-4 w-4" /> Add Application
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Application</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2"><Label>Company *</Label><Input placeholder="e.g. Google" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} /></div>
                <div className="space-y-2"><Label>Role *</Label><Input placeholder="e.g. SWE Intern" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Link (optional)</Label><Input placeholder="https://..." value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} /></div>
              <div className="space-y-2"><Label>Notes</Label><Input placeholder="Any notes..." value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
              <Button onClick={addApp} disabled={!form.company.trim() || !form.role.trim()} className="w-full bg-secondary hover:bg-secondary/90 text-secondary-foreground">Add Application</Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-secondary" /></div>
      ) : apps.length === 0 ? (
        <motion.div variants={fadeUp}>
          <Card className="border-2 border-dashed border-secondary/20">
            <CardContent className="py-12 text-center">
              <Briefcase className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-muted-foreground">No applications yet. Start tracking your first one!</p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div className="space-y-3">
          {apps.map((app, i) => (
            <motion.div key={app.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} layout>
              <Card className="hover:shadow-md transition-all group">
                <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{app.role}</h3>
                      <span className="text-muted-foreground">at</span>
                      <span className="font-medium text-foreground">{app.company}</span>
                      {app.url && (
                        <a href={app.url} target="_blank" rel="noopener noreferrer" className="text-secondary hover:text-secondary/80">
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                      )}
                    </div>
                    {app.notes && <p className="text-sm text-muted-foreground mt-1 truncate">{app.notes}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{app.applied_date ? new Date(app.applied_date).toLocaleDateString() : ""}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select value={app.status} onValueChange={(v) => updateStatus(app.id, v)}>
                      <SelectTrigger className={`w-36 text-xs font-medium border ${statusColors[app.status] || ""}`}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="applied">Applied</SelectItem>
                        <SelectItem value="interviewing">Interviewing</SelectItem>
                        <SelectItem value="offered">Offered</SelectItem>
                        <SelectItem value="accepted">Accepted</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => deleteApp(app.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </motion.div>
  );
};

export default JobTracking;
