import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Search, Loader2, MapPin, BarChart3 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

type Programme = { name: string; institution: string; degree_type: string; match_pct: number; focus: string; location: string };

const Postgrad = () => {
  const [degreeType, setDegreeType] = useState("both");
  const [interests, setInterests] = useState("");
  const [background, setBackground] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Programme[]>([]);
  const [searched, setSearched] = useState(false);

  const searchProgrammes = async () => {
    if (!interests.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { data } = await supabase.functions.invoke("postgrad-match", {
        body: { interests, background, degree_type: degreeType },
      });
      setResults(data?.programmes || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-accent/10"><GraduationCap className="h-7 w-7 text-accent" /></div>
          Postgrad Opportunities
        </h1>
        <p className="mt-2 text-muted-foreground">Discover PhD and Masters programmes matched to your profile.</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="border-2 border-dashed border-accent/20 hover:border-accent/40 transition-colors mb-6">
          <CardHeader>
            <CardTitle>Find Your Match</CardTitle>
            <CardDescription>Enter your interests and background — AI will find the best programmes for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-2 block">Programme Type</Label>
              <ToggleGroup type="single" value={degreeType} onValueChange={(v) => v && setDegreeType(v)} className="justify-start">
                <ToggleGroupItem value="both" className="rounded-l-lg px-4 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">Both</ToggleGroupItem>
                <ToggleGroupItem value="masters" className="px-4 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">Masters</ToggleGroupItem>
                <ToggleGroupItem value="phd" className="rounded-r-lg px-4 data-[state=on]:bg-accent data-[state=on]:text-accent-foreground">PhD</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bg">Previous Degrees / Background</Label>
                <Input id="bg" placeholder="e.g. BSc Computer Science, 2:1" value={background} onChange={(e) => setBackground(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="int">Current Interests *</Label>
                <Input id="int" placeholder="e.g. Machine Learning, NLP" value={interests} onChange={(e) => setInterests(e.target.value)} />
              </div>
            </div>
            <Button onClick={searchProgrammes} disabled={!interests.trim() || loading} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground" size="lg">
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              Find Programmes
            </Button>
          </CardContent>
        </Card>
      </motion.div>

      <AnimatePresence>
        {searched && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {results.length === 0 ? (
              <Card><CardContent className="py-8 text-center text-muted-foreground">No programmes found. Try different interests.</CardContent></Card>
            ) : (
              results.map((prog, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <Card className="hover:shadow-md transition-shadow group">
                    <CardContent className="py-4 flex flex-col sm:flex-row sm:items-center gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-semibold text-foreground truncate">{prog.name}</h3>
                          <Badge variant={prog.degree_type === "PhD" ? "default" : "secondary"} className="text-xs shrink-0">{prog.degree_type}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{prog.institution}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {prog.location}</span>
                          <span>{prog.focus}</span>
                        </div>
                      </div>
                      <div className="sm:w-32 text-right space-y-1">
                        <div className="flex items-center gap-2 justify-end">
                          <BarChart3 className="h-4 w-4 text-accent" />
                          <span className="text-lg font-bold text-accent">{prog.match_pct}%</span>
                        </div>
                        <Progress value={prog.match_pct} className="h-1.5" />
                        <p className="text-xs text-muted-foreground">match</p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default Postgrad;
