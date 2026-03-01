import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, FileText, Loader2, User, GraduationCap, Briefcase, Sparkles, Save, Brain, CheckCircle, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { AvatarSelector } from "@/components/AvatarSelector";
import { BACKEND_URL } from "@/config/backend";

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

interface ParsedProfile {
  name?: string;
  email?: string;
  phone?: string;
  skills?: string[];
  experience?: { company?: string; role?: string; description?: string; start_date?: string; end_date?: string }[];
  education?: { university?: string; degree?: string; field_of_study?: string; start_date?: string; end_date?: string }[];
  languages?: string[];
  certifications?: string[];
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

  // AI CV Parsing state
  const [parsing, setParsing] = useState(false);
  const [parsedProfile, setParsedProfile] = useState<ParsedProfile | null>(null);

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
    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document", "image/jpeg", "image/jpg", "image/png"];
    if (!allowedTypes.includes(file.type)) { toast({ title: "Invalid file", description: "Please upload a PDF, Word document, or image.", variant: "destructive" }); return; }
    if (file.size > 10 * 1024 * 1024) { toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" }); return; }
    setUploading(true);
    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("cvs").upload(filePath, file, { upsert: true });
    if (uploadError) { toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" }); setUploading(false); return; }
    await supabase.from("profiles").update({ cv_url: filePath } as any).eq("user_id", user.id);
    setCvUrl(filePath); setCvFileName(file.name);
    toast({ title: "📄 CV uploaded!" });
    setUploading(false);

    // Auto-parse with AI
    await parseCV(file);
  };

  const parseCV = async (file: File) => {
    setParsing(true);
    setParsedProfile(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`${BACKEND_URL}/api/upload-cv`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error("CV parsing failed");
      const data = await res.json();
      const parsed = data.parsed_profile || null;
      setParsedProfile(parsed);
      if (parsed) {
        // Auto-fill immediately
        autoFillFromParsedData(parsed);
      }
      toast({ title: "🧠 CV parsed with AI!" });
    } catch (err) {
      console.warn("CV parsing failed:", err);
      toast({ title: "CV uploaded but parsing unavailable", description: "The AI parser is currently offline. Your CV is still saved.", variant: "destructive" });
    }
    setParsing(false);
  };

  const autoFillFromParsedData = (data: ParsedProfile) => {
    if (data.name && !displayName) setDisplayName(data.name);
    if (data.education?.length) {
      const newEdu: Education[] = data.education.map((e) => ({
        university: e.university || "",
        degree: e.degree || "",
        field_of_study: e.field_of_study || "",
        start_date: e.start_date || "",
        end_date: e.end_date || "",
      }));
      setEducation(newEdu);
    }
    if (data.experience?.length) {
      const newWork: WorkExperience[] = data.experience.map((w) => ({
        company: w.company || "",
        role: w.role || "",
        description: w.description || "",
        start_date: w.start_date || "",
        end_date: w.end_date || "",
      }));
      setWorkExperience(newWork);
    }
  };

  const autoFillFromParsed = () => {
    if (!parsedProfile) return;
    autoFillFromParsedData(parsedProfile);
    toast({ title: "✨ Profile auto-filled from CV!" });
  };

  const handleDeleteCV = async () => {
    if (!user || !cvUrl) return;
    // Only remove the file and clear CV URL — keep education/work data
    await Promise.all([
      supabase.storage.from("cvs").remove([cvUrl]),
      supabase.from("profiles").update({ cv_url: null } as any).eq("user_id", user.id),
    ]);
    setCvUrl(null); setCvFileName(null); setParsedProfile(null);
    toast({ title: "CV removed" });
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
            <CardDescription>Upload your CV — AI will parse it and auto-fill your profile</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {cvUrl ? (
              <motion.div initial={{ scale: 0.95 }} animate={{ scale: 1 }} className="flex items-center gap-3 rounded-xl border p-4 bg-muted/30 card-glow">
                <FileText className="h-6 w-6 text-secondary" />
                <span className="flex-1 font-semibold truncate">{cvFileName}</span>
                <Badge variant="secondary" className="text-xs">Uploaded ✓</Badge>
                <Button variant="destructive" size="sm" onClick={handleDeleteCV}><Trash2 className="h-4 w-4" /></Button>
              </motion.div>
            ) : (
              <>
                <input ref={fileInputRef} type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" className="hidden" onChange={handleUploadCV} />
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading || parsing} className="gap-2 font-bold h-11">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Upload CV
                  </Button>
                </motion.div>
              </>
            )}

            {/* Parsing indicator */}
            {parsing && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <div>
                  <p className="font-semibold text-sm">Parsing your CV with AI...</p>
                  <p className="text-xs text-muted-foreground">This takes 5–10 seconds</p>
                </div>
              </motion.div>
            )}

            {/* Parsed Results */}
            <AnimatePresence>
              {parsedProfile && !parsing && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
                  {/* Parsed Data Summary */}
                  <div className="p-4 rounded-xl border border-accent/20 bg-accent/5 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Brain className="h-4 w-4 text-accent" />
                        <span className="font-bold text-sm">AI Parsed Profile</span>
                      </div>
                      <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                        <Button size="sm" onClick={autoFillFromParsed} className="gap-1.5 text-xs font-bold bg-accent hover:bg-accent/90 text-accent-foreground h-8">
                          <Wand2 className="h-3.5 w-3.5" /> Auto-fill Profile
                        </Button>
                      </motion.div>
                    </div>

                    {parsedProfile.name && (
                      <div className="text-xs"><span className="font-semibold text-muted-foreground">Name:</span> <span className="font-medium">{parsedProfile.name}</span></div>
                    )}

                    {parsedProfile.skills && parsedProfile.skills.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Skills:</span>
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {parsedProfile.skills.map((skill, i) => (
                            <Badge key={i} variant="secondary" className="text-[10px] font-bold">{skill}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedProfile.education && parsedProfile.education.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Education: {parsedProfile.education.length} entries</span>
                        <div className="mt-1 space-y-1">
                          {parsedProfile.education.map((e, i) => (
                            <div key={i} className="text-xs flex items-center gap-1.5">
                              <CheckCircle className="h-3 w-3 text-accent" />
                              <span>{e.degree} {e.field_of_study ? `in ${e.field_of_study}` : ""} — {e.university}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedProfile.experience && parsedProfile.experience.length > 0 && (
                      <div>
                        <span className="text-xs font-semibold text-muted-foreground">Experience: {parsedProfile.experience.length} entries</span>
                        <div className="mt-1 space-y-1">
                          {parsedProfile.experience.map((w, i) => (
                            <div key={i} className="text-xs flex items-center gap-1.5">
                              <CheckCircle className="h-3 w-3 text-secondary" />
                              <span>{w.role} at {w.company}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedProfile.languages && parsedProfile.languages.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Languages:</span>
                        <div className="flex gap-1">
                          {parsedProfile.languages.map((l, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{l}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {parsedProfile.certifications && parsedProfile.certifications.length > 0 && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-muted-foreground">Certs:</span>
                        <div className="flex gap-1 flex-wrap">
                          {parsedProfile.certifications.map((c, i) => (
                            <Badge key={i} variant="outline" className="text-[10px]">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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
