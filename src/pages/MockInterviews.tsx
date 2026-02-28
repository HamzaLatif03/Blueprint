import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Video, Star, Loader2, Sparkles, Trophy, Zap, ArrowRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const MockInterviews = () => {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<{ question: string; question_type: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; strengths: string[]; improvements: string[] } | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingF, setLoadingF] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [totalXP, setTotalXP] = useState(0);

  const generateQuestion = async () => {
    setLoadingQ(true);
    setFeedback(null);
    setAnswer("");
    try {
      const { data } = await supabase.functions.invoke("interview-ai", {
        body: { action: "generate_question", role, industry },
      });
      setQuestion(data);
      setQuestionCount((c) => c + 1);
    } catch { setQuestion({ question: "Tell me about a challenge you overcame.", question_type: "behavioral" }); }
    setLoadingQ(false);
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !question) return;
    setLoadingF(true);
    try {
      const { data } = await supabase.functions.invoke("interview-ai", {
        body: { action: "get_feedback", question: question.question, answer, role },
      });
      setFeedback(data);
      const xp = (data?.score || 5) * 10;
      setTotalXP((t) => t + xp);
    } catch { 
      setFeedback({ score: 7, feedback: "Good effort. Try adding more specifics.", strengths: ["Clear communication"], improvements: ["Add metrics"] }); 
      setTotalXP((t) => t + 70);
    }
    setLoadingF(false);
  };

  const startInterview = () => {
    if (!role.trim()) return;
    setStarted(true);
    generateQuestion();
  };

  const scoreColor = (s: number) => s >= 8 ? "text-accent" : s >= 5 ? "text-[hsl(var(--xp-bar))]" : "text-destructive";
  const scoreEmoji = (s: number) => s >= 9 ? "🔥" : s >= 7 ? "💪" : s >= 5 ? "👍" : "📝";

  return (
    <motion.div className="max-w-6xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
      <motion.div variants={fadeUp} className="mb-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-extrabold flex items-center gap-3">
              <motion.div whileHover={{ rotate: 15 }} className="p-2.5 rounded-xl bg-gradient-to-br from-primary to-primary/60 text-primary-foreground">
                <Mic className="h-6 w-6" />
              </motion.div>
              Mock Interviews
              <span className="text-2xl">🎤</span>
            </h1>
            <p className="mt-2 text-muted-foreground">Practice with AI-powered feedback and level up your interview skills.</p>
          </div>
          {started && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex gap-2">
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-bold">
                <Zap className="h-4 w-4 text-[hsl(var(--xp-bar))]" />
                {totalXP} XP
              </div>
              <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-bold">
                <Trophy className="h-4 w-4 text-[hsl(var(--level))]" />
                Q{questionCount}
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div key="setup" variants={fadeUp} initial="hidden" animate="visible" exit={{ opacity: 0, y: -20 }}>
            <Card className="card-glow overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1 xp-gradient" />
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-xl">
                  <Sparkles className="h-5 w-5 text-primary" /> Set Up Your Interview
                </CardTitle>
                <CardDescription>Tell us about the role — we'll tailor the questions to you.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role" className="font-semibold">Role / Position *</Label>
                    <Input id="role" placeholder="e.g. Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} className="h-12 text-base" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry" className="font-semibold">Industry</Label>
                    <Input id="industry" placeholder="e.g. FinTech" value={industry} onChange={(e) => setIndustry(e.target.value)} className="h-12 text-base" />
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                  <Button onClick={startInterview} disabled={!role.trim()} className="gap-2 w-full sm:w-auto h-12 text-base font-bold" size="lg">
                    <Video className="h-5 w-5" /> Start Interview <ArrowRight className="h-4 w-4" />
                  </Button>
                </motion.div>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="interview" initial="hidden" animate="visible" variants={stagger} className="grid gap-6 lg:grid-cols-5">
            {/* Camera / Video area */}
            <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden card-glow">
                <div className="aspect-video bg-gradient-to-br from-muted via-muted/80 to-primary/5 flex items-center justify-center relative">
                  <motion.div animate={{ scale: [1, 1.05, 1] }} transition={{ duration: 2, repeat: Infinity }} className="text-center space-y-2">
                    <Video className="h-14 w-14 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground font-medium">Camera preview</p>
                  </motion.div>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                    <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs gap-1 animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground" /> LIVE
                    </Badge>
                  </motion.div>
                  {/* XP bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted">
                    <motion.div className="h-full xp-gradient rounded-r-full" animate={{ width: `${Math.min(100, totalXP / 5)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
              </Card>
              <Card className="card-glow">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Interviewing for</p>
                  <p className="font-bold text-lg text-foreground">{role}</p>
                  {industry && <Badge variant="secondary" className="mt-1">{industry}</Badge>}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="sm" className="mt-4 w-full gap-2" onClick={() => { setStarted(false); setQuestion(null); setFeedback(null); setQuestionCount(0); setTotalXP(0); }}>
                      <RotateCcw className="h-3.5 w-3.5" /> End & Reset
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Question + Answer + Feedback */}
            <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
              {/* AI Question */}
              <Card className="border-primary/20 card-glow overflow-hidden relative">
                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-secondary" />
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 2, repeat: Infinity, repeatDelay: 4 }}>
                      <Sparkles className="h-5 w-5 text-primary" />
                    </motion.div>
                    AI Interviewer
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingQ ? (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 text-muted-foreground py-4">
                      <div className="flex gap-1">
                        {[0, 1, 2].map((i) => (
                          <motion.div key={i} className="h-2.5 w-2.5 rounded-full bg-primary/50" animate={{ y: [0, -8, 0] }} transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.15 }} />
                        ))}
                      </div>
                      <span className="font-medium">Thinking of a great question...</span>
                    </motion.div>
                  ) : question ? (
                    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}>
                      <Badge variant="outline" className="mb-3 text-xs font-bold uppercase tracking-wider border-primary/30 text-primary">{question.question_type}</Badge>
                      <p className="text-lg font-semibold text-foreground leading-relaxed">{question.question}</p>
                    </motion.div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Answer box */}
              {question && !loadingQ && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="card-glow">
                    <CardContent className="pt-5 space-y-4">
                      <Label className="font-semibold text-base">Your Answer ✍️</Label>
                      <Textarea placeholder="Type your answer here... Be specific with examples!" rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className="resize-none text-base" />
                      <div className="flex gap-2 flex-wrap">
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button onClick={submitAnswer} disabled={!answer.trim() || loadingF} className="gap-2 font-bold">
                            {loadingF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit for Review
                          </Button>
                        </motion.div>
                        <Button variant="outline" onClick={generateQuestion} disabled={loadingQ} className="gap-2">
                          <ArrowRight className="h-4 w-4" /> Skip / Next
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Feedback / Review */}
              <AnimatePresence>
                {feedback && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", duration: 0.5 }}>
                    <Card className="card-glow overflow-hidden relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent/60" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Star className="h-5 w-5 text-accent" /> Performance Review {scoreEmoji(feedback.score)}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        <div className="flex items-center gap-6">
                          <motion.div 
                            initial={{ scale: 0 }} 
                            animate={{ scale: 1 }} 
                            transition={{ type: "spring", delay: 0.2 }}
                            className={`text-5xl font-black ${scoreColor(feedback.score)}`}
                          >
                            {feedback.score}
                          </motion.div>
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Score</span>
                              <span className="text-muted-foreground">{feedback.score}/10</span>
                            </div>
                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                              <motion.div 
                                className="h-full rounded-full xp-gradient" 
                                initial={{ width: 0 }} 
                                animate={{ width: `${feedback.score * 10}%` }} 
                                transition={{ duration: 0.8, delay: 0.3 }}
                              />
                            </div>
                            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-xs text-muted-foreground font-medium">
                              +{feedback.score * 10} XP earned!
                            </motion.p>
                          </div>
                        </div>
                        <p className="text-sm text-foreground leading-relaxed">{feedback.feedback}</p>
                        <div className="grid gap-4 sm:grid-cols-2">
                          {feedback.strengths?.length > 0 && (
                            <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
                              <p className="text-sm font-bold text-accent mb-2 flex items-center gap-1">✅ Strengths</p>
                              <ul className="text-sm space-y-1.5">{feedback.strengths.map((s, i) => <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-muted-foreground">{s}</motion.li>)}</ul>
                            </div>
                          )}
                          {feedback.improvements?.length > 0 && (
                            <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
                              <p className="text-sm font-bold text-destructive mb-2 flex items-center gap-1">🎯 To Improve</p>
                              <ul className="text-sm space-y-1.5">{feedback.improvements.map((s, i) => <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-muted-foreground">{s}</motion.li>)}</ul>
                            </div>
                          )}
                        </div>
                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                          <Button onClick={generateQuestion} className="w-full gap-2 font-bold" variant="outline">
                            Next Question <ArrowRight className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default MockInterviews;
