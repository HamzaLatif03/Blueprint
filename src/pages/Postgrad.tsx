import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GraduationCap, Search, Loader2, MapPin, BarChart3, Sparkles, Trophy } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

type Programme = { name: string; institution: string; degree_type: string; match_pct: number; focus: string; location: string };

const matchColor = (pct: number) => pct >= 85 ? "text-accent" : pct >= 70 ? "text-[hsl(var(--xp-bar))]" : "text-secondary";
const matchEmoji = (pct: number) => pct >= 90 ? "🔥" : pct >= 80 ? "⭐" : pct >= 70 ? "👍" : "📝";

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
    <motion.div className="max-w-5xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-extrabold flex items-center gap-3">
          <motion.div whileHover={{ rotate: 15 }} className="p-2.5 rounded-xl bg-gradient-to-br from-accent to-accent/60 text-accent-foreground">
            <GraduationCap className="h-6 w-6" />
          </motion.div>
          Postgrad Opportunities
          <span className="text-2xl">🎓</span>
        </h1>
        <p className="mt-2 text-muted-foreground">Discover PhD and Masters programmes matched to your profile.</p>
      </motion.div>

      <motion.div variants={fadeUp}>
        <Card className="card-glow overflow-hidden relative mb-6">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent/60" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Sparkles className="h-5 w-5 text-accent" /> Find Your Match</CardTitle>
            <CardDescription>Enter your interests and background — AI will find the best programmes for you.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            <div>
              <Label className="mb-3 block font-semibold">Programme Type</Label>
              <ToggleGroup type="single" value={degreeType} onValueChange={(v) => v && setDegreeType(v)} className="justify-start gap-0 rounded-xl border border-border overflow-hidden p-0.5 bg-muted">
                <ToggleGroupItem value="both" className="rounded-lg px-5 py-2.5 font-semibold data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-sm transition-all">
                  🎯 Both
                </ToggleGroupItem>
                <ToggleGroupItem value="masters" className="rounded-lg px-5 py-2.5 font-semibold data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-sm transition-all">
                  📚 Masters
                </ToggleGroupItem>
                <ToggleGroupItem value="phd" className="rounded-lg px-5 py-2.5 font-semibold data-[state=on]:bg-accent data-[state=on]:text-accent-foreground data-[state=on]:shadow-sm transition-all">
                  🔬 PhD
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="bg" className="font-semibold">Previous Degrees / Background</Label>
                <Input id="bg" placeholder="e.g. BSc Computer Science, 2:1" value={background} onChange={(e) => setBackground(e.target.value)} className="h-12 text-base" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="int" className="font-semibold">Current Interests *</Label>
                <Input id="int" placeholder="e.g. Machine Learning, NLP" value={interests} onChange={(e) => setInterests(e.target.value)} className="h-12 text-base" />
              </div>
            </div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button onClick={searchProgrammes} disabled={!interests.trim() || loading} className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground h-12 text-base font-bold" size="lg">
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                Find Programmes
              </Button>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl shimmer-bg animate-shimmer" />
          ))}
        </div>
      )}

      <AnimatePresence>
        {searched && !loading && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 mb-4">
                <Trophy className="h-5 w-5 text-[hsl(var(--xp-bar))]" />
                <span className="text-sm font-bold">{results.length} programmes found!</span>
              </motion.div>
            )}
            {results.length === 0 ? (
              <Card className="card-glow"><CardContent className="py-10 text-center text-muted-foreground">
                <p className="text-4xl mb-3">🔍</p>
                <p className="font-medium">No programmes found. Try different interests.</p>
              </CardContent></Card>
            ) : (
              results.map((prog, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}>
                  <motion.div whileHover={{ x: 4 }}>
                    <Card className="card-glow card-glow-hover hover:border-accent/30 transition-all group overflow-hidden relative">
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${prog.match_pct >= 85 ? "bg-accent" : prog.match_pct >= 70 ? "bg-[hsl(var(--xp-bar))]" : "bg-secondary"}`} />
                      <CardContent className="py-4 pl-5 flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <h3 className="font-bold text-foreground">{prog.name}</h3>
                            <Badge variant={prog.degree_type === "PhD" ? "default" : "secondary"} className="text-xs font-bold">{prog.degree_type}</Badge>
                            <span>{matchEmoji(prog.match_pct)}</span>
                          </div>
                          <p className="text-sm text-muted-foreground font-medium">{prog.institution}</p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {prog.location}</span>
                            <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{prog.focus}</span>
                          </div>
                        </div>
                        <div className="sm:w-36 text-right space-y-1.5">
                          <div className="flex items-center gap-2 justify-end">
                            <BarChart3 className="h-4 w-4 text-accent" />
                            <span className={`text-2xl font-black ${matchColor(prog.match_pct)}`}>{prog.match_pct}%</span>
                          </div>
                          <div className="h-2 rounded-full bg-muted overflow-hidden">
                            <motion.div 
                              className="h-full rounded-full xp-gradient" 
                              initial={{ width: 0 }} 
                              animate={{ width: `${prog.match_pct}%` }} 
                              transition={{ duration: 0.6, delay: i * 0.1 }}
                            />
                          </div>
                          <p className="text-xs text-muted-foreground font-medium">match</p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
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
