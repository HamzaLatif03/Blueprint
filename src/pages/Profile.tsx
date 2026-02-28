import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Upload, FileText, Loader2, User, GraduationCap, Briefcase } from "lucide-react";

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
    }
    if (eduRes.data) setEducation(eduRes.data as any[]);
    if (workRes.data) setWorkExperience(workRes.data as any[]);

    // Get CV filename
    if ((profileRes.data as any)?.cv_url) {
      const parts = ((profileRes.data as any).cv_url as string).split("/");
      setCvFileName(decodeURIComponent(parts[parts.length - 1]));
    }

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName, bio } as any)
      .eq("user_id", user.id);

    if (error) {
      toast({ title: "Error saving profile", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Profile saved" });
    }
    setSaving(false);
  };

  const handleUploadCV = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];
    if (!allowedTypes.includes(file.type)) {
      toast({ title: "Invalid file", description: "Please upload a PDF or Word document.", variant: "destructive" });
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Max file size is 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const filePath = `${user.id}/${file.name}`;
    const { error: uploadError } = await supabase.storage.from("cvs").upload(filePath, file, { upsert: true });

    if (uploadError) {
      toast({ title: "Upload failed", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    await supabase.from("profiles").update({ cv_url: filePath } as any).eq("user_id", user.id);
    setCvUrl(filePath);
    setCvFileName(file.name);
    toast({ title: "CV uploaded" });
    setUploading(false);
  };

  const handleDeleteCV = async () => {
    if (!user || !cvUrl) return;
    await supabase.storage.from("cvs").remove([cvUrl]);
    await supabase.from("profiles").update({ cv_url: null } as any).eq("user_id", user.id);
    setCvUrl(null);
    setCvFileName(null);
    toast({ title: "CV removed" });
  };

  // Education CRUD
  const addEducation = () => {
    setEducation([...education, { university: "", degree: "", field_of_study: "", start_date: "", end_date: "" }]);
  };

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    const updated = [...education];
    (updated[index] as any)[field] = value;
    setEducation(updated);
  };

  const removeEducation = async (index: number) => {
    const item = education[index];
    if (item.id) {
      await supabase.from("education" as any).delete().eq("id", item.id);
    }
    setEducation(education.filter((_, i) => i !== index));
    toast({ title: "Education entry removed" });
  };

  const saveEducation = async () => {
    if (!user) return;
    setSaving(true);
    for (const entry of education) {
      if (!entry.university.trim()) continue;
      const data = {
        user_id: user.id,
        university: entry.university.trim().slice(0, 200),
        degree: entry.degree.trim().slice(0, 200) || null,
        field_of_study: entry.field_of_study.trim().slice(0, 200) || null,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
      };
      if (entry.id) {
        await supabase.from("education" as any).update(data).eq("id", entry.id);
      } else {
        const { data: inserted } = await supabase.from("education" as any).insert(data).select().single();
        if (inserted) entry.id = (inserted as any).id;
      }
    }
    toast({ title: "Education saved" });
    setSaving(false);
  };

  // Work Experience CRUD
  const addWork = () => {
    setWorkExperience([...workExperience, { company: "", role: "", description: "", start_date: "", end_date: "" }]);
  };

  const updateWork = (index: number, field: keyof WorkExperience, value: string) => {
    const updated = [...workExperience];
    (updated[index] as any)[field] = value;
    setWorkExperience(updated);
  };

  const removeWork = async (index: number) => {
    const item = workExperience[index];
    if (item.id) {
      await supabase.from("work_experience" as any).delete().eq("id", item.id);
    }
    setWorkExperience(workExperience.filter((_, i) => i !== index));
    toast({ title: "Work experience removed" });
  };

  const saveWork = async () => {
    if (!user) return;
    setSaving(true);
    for (const entry of workExperience) {
      if (!entry.company.trim()) continue;
      const data = {
        user_id: user.id,
        company: entry.company.trim().slice(0, 200),
        role: entry.role.trim().slice(0, 200) || null,
        description: entry.description.trim().slice(0, 1000) || null,
        start_date: entry.start_date || null,
        end_date: entry.end_date || null,
      };
      if (entry.id) {
        await supabase.from("work_experience" as any).update(data).eq("id", entry.id);
      } else {
        const { data: inserted } = await supabase.from("work_experience" as any).insert(data).select().single();
        if (inserted) entry.id = (inserted as any).id;
      }
    }
    toast({ title: "Work experience saved" });
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-6">
      <h1 className="text-3xl font-bold flex items-center gap-3">
        <User className="h-8 w-8 text-primary" />
        Profile
      </h1>

      {/* Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Your display name and bio</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Display Name</Label>
            <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={100} placeholder="Your name" />
          </div>
          <div className="space-y-2">
            <Label>Bio</Label>
            <Input value={bio} onChange={(e) => setBio(e.target.value)} maxLength={500} placeholder="A short bio about yourself" />
          </div>
          <Button onClick={handleSaveProfile} disabled={saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Save
          </Button>
        </CardContent>
      </Card>

      {/* CV Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-secondary" /> CV / Resume
          </CardTitle>
          <CardDescription>Upload your CV as a PDF or Word document (max 10MB)</CardDescription>
        </CardHeader>
        <CardContent>
          {cvUrl ? (
            <div className="flex items-center gap-3 rounded-lg border p-3 bg-muted/50">
              <FileText className="h-5 w-5 text-primary" />
              <span className="flex-1 text-sm font-medium truncate">{cvFileName}</span>
              <Button variant="destructive" size="sm" onClick={handleDeleteCV}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx"
                className="hidden"
                onChange={handleUploadCV}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                Upload CV
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Education */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5 text-accent" /> Education
          </CardTitle>
          <CardDescription>Universities and institutions you've attended</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {education.map((entry, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeEducation(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">University *</Label>
                  <Input value={entry.university} onChange={(e) => updateEducation(i, "university", e.target.value)} placeholder="University name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Degree</Label>
                  <Input value={entry.degree} onChange={(e) => updateEducation(i, "degree", e.target.value)} placeholder="e.g. BSc, MSc, PhD" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Field of Study</Label>
                  <Input value={entry.field_of_study} onChange={(e) => updateEducation(i, "field_of_study", e.target.value)} placeholder="e.g. Computer Science" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Start</Label>
                    <Input type="date" value={entry.start_date} onChange={(e) => updateEducation(i, "start_date", e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">End</Label>
                    <Input type="date" value={entry.end_date} onChange={(e) => updateEducation(i, "end_date", e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addEducation} className="gap-2">
              <Plus className="h-4 w-4" /> Add Education
            </Button>
            {education.length > 0 && (
              <Button onClick={saveEducation} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Education
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Work Experience */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5 text-secondary" /> Work Experience
          </CardTitle>
          <CardDescription>Your professional experience</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {workExperience.map((entry, i) => (
            <div key={i} className="space-y-3 rounded-lg border p-4 relative">
              <Button
                variant="ghost"
                size="icon"
                className="absolute top-2 right-2 h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeWork(i)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label className="text-xs">Company *</Label>
                  <Input value={entry.company} onChange={(e) => updateWork(i, "company", e.target.value)} placeholder="Company name" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Role</Label>
                  <Input value={entry.role} onChange={(e) => updateWork(i, "role", e.target.value)} placeholder="Job title" />
                </div>
                <div className="sm:col-span-2 space-y-1">
                  <Label className="text-xs">Description</Label>
                  <Input value={entry.description} onChange={(e) => updateWork(i, "description", e.target.value)} placeholder="Brief description of responsibilities" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start</Label>
                  <Input type="date" value={entry.start_date} onChange={(e) => updateWork(i, "start_date", e.target.value)} />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End</Label>
                  <Input type="date" value={entry.end_date} onChange={(e) => updateWork(i, "end_date", e.target.value)} />
                </div>
              </div>
            </div>
          ))}
          <div className="flex gap-2">
            <Button variant="outline" onClick={addWork} className="gap-2">
              <Plus className="h-4 w-4" /> Add Experience
            </Button>
            {workExperience.length > 0 && (
              <Button onClick={saveWork} disabled={saving}>
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Save Experience
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
