import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, FileText, Loader2, User, GraduationCap, Briefcase, Sparkles, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarSelector } from "@/components/AvatarSelector";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

interface Education {
  id?: string;
  university: string;
  degree: string;
  field_of_study: string;
  start_date: string;
  end_date: string;
}

interface WorkExperience {
  id?: string;
  company: string;
  role: string;
  description: string;
  start_date: string;
  end_date: string;
}

const Profile = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [cvUrl, setCvUrl] = useState<string | null>(null);
  const [selectedAvatar, setSelectedAvatar] = useState<string | null>(null);
  const [cvFileName, setCvFileName] = useState<string | null>(null);
  const [education, setEducation] = useState<Education[]>([]);
  const [workExperience, setWorkExperience] = useState<WorkExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    if (!user) return;
    setLoading(true);
    const [profileRes, eduRes, workRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", user.id).single(),
      supabase.from("education" as any).select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
      supabase.from("work_experience" as any).select("*").eq("user_id", user.id).order("start_date", { ascending: false }),
    ]);
    if (profileRes.data) {
      setDisplayName(profileRes.data.display_name || "");
      setBio(profileRes.data.bio || "");
      setCvUrl((profileRes.data as any).cv_url || null);
      setSelectedAvatar((profileRes.data as any).avatar_url || null);
    }
    if (eduRes.data) setEducation(eduRes.data as any[]);
    if (workRes.data) setWorkExperience(workRes.data as any[]);
    if ((profileRes.data as any)?.cv_url) {
      const parts = ((profileRes.data as any).cv_url as string).split("/");
      setCvFileName(decodeURIComponent(parts[parts.length - 1]));
    }
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ display_name: displayName, bio } as any).eq("user_id", user.id);
    if (error) { toast({ title: "Error saving profile", description: error.message, variant: "destructive" }); }
    else { toast({ title: "✅ Profile saved!" }); }
    setSaving(false);
  };

  const handleUploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) { toast({ title: "Invalid file", description: "Please upload a PDF or Word document.", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" }); return; }
    setUploading(true);
    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("cvs").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    await supabase.from("profiles").update({ cv_url: filePath } as any).eq("user_id", user.id);
    setCvUrl(filePath); setCvFileName(file.name);
    toast({ title: "📄 CV uploaded!" }); setUploading(false);
  };

  const handleDeleteCV = async () => {
    if (!user || !cvUrl) return;
    await supabase.storage.from("cvs").remove([cvUrl]);
    await supabase.from("profiles").update({ cv_url: null } as any).eq("user_id", user.id);
    setCvUrl(null); setCvFileName(null); toast({ title: "CV removed" });
  };

  const addEducation = () => { setEducation([...education, { university: "", degree: "", field_of_study: "", start_date: "", end_date: "" }]); };
  const updateEducation = (index: number, field: keyof Education, value: string) => { const updated = [...education]; (updated[index] as any)[field] = value; setEducation(updated); };
  const removeEducation = async (index: number) => {
    const item = education[index];
    if (item.id) { await supabase.from("education" as any).delete().eq("id", item.id); }
    setEducation(education.filter((_, i) => i !== index)); toast({ title: "Education entry removed" });
  };
  const saveEducation = async () => {
    if (!user) return; setSaving(true);
    for (const entry of education) {
      if (!entry.university.trim()) continue;
      const data = { user_id: user.id, university: entry.university.trim().slice(0, 200), degree: entry.degree.trim().slice(0, 200) || null, field_of_study: entry.field_of_study.trim().slice(0, 200) || null, start_date: entry.start_date || null, end_date: entry.end_date || null };
      if (entry.id) { await supabase.from("education" as any).update(data).eq("id", entry.id); }
      else { const { data: inserted } = await supabase.from("education" as any).insert(data).select().single(); if (inserted) entry.id = (inserted as any).id; }
    }
    toast({ title: "🎓 Education saved!" }); setSaving(false);
  };

  const addWork = () => { setWorkExperience([...workExperience, { company: "", role: "", description: "", start_date: "", end_date: "" }]); };
  const updateWork = (index: number, field: keyof WorkExperience, value: string) => { const updated = [...workExperience]; (updated[index] as any)[field] = value; setWorkExperience(updated); };
  const removeWork = async (index: number) => {
    const item = workExperience[index];
    if (item.id) { await supabase.from("work_experience" as any).delete().eq("id", item.id); }
    setWorkExperience(workExperience.filter((_, i) => i !== index)); toast({ title: "Work experience removed" });
  };
  const saveWork = async () => {
    if (!user) return; setSaving(true);
    for (const entry of workExperience) {
      if (!entry.company.trim()) continue;
      const data = { user_id: user.id, company: entry.company.trim().slice(0, 200), role: entry.role.trim().slice(0, 200) || null, description: entry.description.trim().slice(0, 1000) || null, start_date: entry.start_date || null, end_date: entry.end_date || null };
      if (entry.id) { await supabase.from("work_experience" as any).update(data).eq("id", entry.id); }
      else { const { data: inserted } = await supabase.from("work_experience" as any).insert(data).select().single(); if (inserted) entry.id = (inserted as any).id; }
    }
    toast({ title: "💼 Work experience saved!" }); setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <motion.div className="max-w-3xl mx-auto space-y-6" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp}>
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <motion.div whileHover={{ rotate: 15 }} className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
            <User className="h-6 w-6" />
          </motion.div>
          Profile
          <span className="text-2xl">👤</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Your info is saved and used across all Blueprint features.</p>
      </motion.div>

      {/* Avatar Selector */}
      <motion.div variants={fadeUp}>
        <AvatarSelector selectedAvatar={selectedAvatar} onSelect={setSelectedAvatar} />
      </motion.div>

      {/* Basic Info */}
      <motion.div variants={fadeUp}>
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-primary/60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Personal Information</CardTitle>
            <CardDescription>Your display name and bio</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label className="font-semibold">Display Name</Label><Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} placeholder="Your name" className="h-11" /></div>
              <div className="space-y-2"><Label className="font-semibold">Bio</Label><Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="A short bio" className="h-11" /></div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={handleSaveProfile} disabled={saving} className="gap-2 font-bold">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save Profile
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* CV Upload */}
      <motion.div variants={fadeUp}>
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-secondary/60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-secondary" /> CV / Resume 📄</CardTitle>
            <CardDescription>Upload your CV (PDF or Word, max 10MB)</CardDescription>
          </CardHeader>
          <CardContent>
            {cvUrl ? (
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-xl border p-4 bg-muted/30 card-glow">
                <FileText className="h-6 w-6 text-secondary" />
                <span className="flex-1 font-semibold truncate">{cvFileName}</span>
                <Badge variant="secondary" className="text-xs">Uploaded ✓</Badge>
                <Button variant="destructive" size="sm" onClick={handleDeleteCV}><Trash2 className="h-4 w-4" /></Button>
              </motion.div>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleUploadCV} />
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="gap-2 font-bold h-11">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload CV
                  </Button>
                </motion.div>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Education */}
      <motion.div variants={fadeUp}>
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent/60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-accent" /> Education 🎓</CardTitle>
            <CardDescription>Universities and institutions you've attended</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {education.map((entry, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="space-y-3 rounded-xl border p-4 relative card-glow hover:border-accent/30 transition-colors">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeEducation(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs font-semibold">University *</Label><Input value={entry.university} onChange={(e) => updateEducation(i, "university", e.target.value)} placeholder="University name" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">Degree</Label><Input value={entry.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="e.g. BSc, MSc, PhD" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">Field of Study</Label><Input value={entry.field_of_study} onChange={(e) => updateEducation(i, "field_of_study", e.target.value)} placeholder="e.g. Computer Science" /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className="text-xs font-semibold">Start</Label><Input type="date" value={entry.start_date} onChange={(e) => updateEducation(i, "start_date", e.target.value)} /></div>
                    <div className="space-y-1"><Label className="text-xs font-semibold">End</Label><Input type="date" value={entry.end_date} onChange={(e) => updateEducation(i, "end_date", e.target.value)} /></div>
                  </div>
                </div>
              </motion.div>
            ))}
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" onClick={addEducation} className="gap-2 font-bold"><Plus className="h-4 w-4" /> Add Education</Button>
              </motion.div>
              {education.length > 0 && (
                <Button onClick={saveEducation} disabled={saving} className="gap-2 font-bold bg-accent hover:bg-accent/90 text-accent-foreground">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Work Experience */}
      <motion.div variants={fadeUp}>
        <Card className="card-glow overflow-hidden relative">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-secondary/60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Briefcase className="h-5 w-5 text-secondary" /> Work Experience 💼</CardTitle>
            <CardDescription>Your professional experience</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {workExperience.map((entry, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="space-y-3 rounded-xl border p-4 relative card-glow hover:border-secondary/30 transition-colors">
                <Button variant="ghost" size="icon" className="absolute top-2 right-2 h-8 w-8 text-muted-foreground hover:text-destructive transition-colors" onClick={() => removeWork(i)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1"><Label className="text-xs font-semibold">Company *</Label><Input value={entry.company} onChange={(e) => updateWork(i, "company", e.target.value)} placeholder="Company name" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">Role</Label><Input value={entry.role} onChange={(e) => updateWork(i, "role", e.target.value)} placeholder="Job title" /></div>
                  <div className="sm:col-span-2 space-y-1"><Label className="text-xs font-semibold">Description</Label><Input value={entry.description} onChange={(e) => updateWork(i, "description", e.target.value)} placeholder="Brief description" /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">Start</Label><Input type="date" value={entry.start_date} onChange={(e) => updateWork(i, "start_date", e.target.value)} /></div>
                  <div className="space-y-1"><Label className="text-xs font-semibold">End</Label><Input type="date" value={entry.end_date} onChange={(e) => updateWork(i, "end_date", e.target.value)} /></div>
                </div>
              </motion.div>
            ))}
            <div className="flex gap-2">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <Button variant="outline" onClick={addWork} className="gap-2 font-bold"><Plus className="h-4 w-4" /> Add Experience</Button>
              </motion.div>
              {workExperience.length > 0 && (
                <Button onClick={saveWork} disabled={saving} className="gap-2 font-bold bg-secondary hover:bg-secondary/90 text-secondary-foreground">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Save
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

export default Profile;
