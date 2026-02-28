import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, Send, Video, Star, Loader2, Sparkles } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";

const fadeUp = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } };

const MockInterviews = () => {
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<{ question: string; question_type: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; strengths: string[]; improvements: string[] } | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingF, setLoadingF] = useState(false);

  const generateQuestion = async () => {
    setLoadingQ(true);
    setFeedback(null);
    setAnswer("");
    try {
      const { data } = await supabase.functions.invoke("interview-ai", {
        body: { action: "generate_question", role, industry },
      });
      setQuestion(data);
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
    } catch { setFeedback({ score: 7, feedback: "Good effort. Try adding more specifics.", strengths: ["Clear communication"], improvements: ["Add metrics"] }); }
    setLoadingF(false);
  };

  const startInterview = () => {
    if (!role.trim()) return;
    setStarted(true);
    generateQuestion();
  };

  return (
    <motion.div className="max-w-6xl mx-auto" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }}>
      <motion.div variants={fadeUp} className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-primary/10"><Mic className="h-7 w-7 text-primary" /></div>
          Mock Interviews
        </h1>
        <p className="mt-2 text-muted-foreground">Practice with AI-powered feedback on your interview responses.</p>
      </motion.div>

      <AnimatePresence mode="wait">
        {!started ? (
          <motion.div key="setup" variants={fadeUp} initial="hidden" animate="visible" exit="hidden">
            <Card className="border-2 border-dashed border-primary/20 hover:border-primary/40 transition-colors">
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Sparkles className="h-5 w-5 text-primary" /> Set Up Your Interview</CardTitle>
                <CardDescription>Tell us about the role you're preparing for.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="role">Role / Position *</Label>
                    <Input id="role" placeholder="e.g. Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="industry">Industry</Label>
                    <Input id="industry" placeholder="e.g. FinTech" value={industry} onChange={(e) => setIndustry(e.target.value)} />
                  </div>
                </div>
                <Button onClick={startInterview} disabled={!role.trim()} className="gap-2 w-full sm:w-auto" size="lg">
                  <Video className="h-4 w-4" /> Start Interview
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          <motion.div key="interview" initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="grid gap-6 lg:grid-cols-5">
            {/* Camera / Video area */}
            <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden">
                <div className="aspect-video bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center relative">
                  <div className="text-center space-y-2">
                    <Video className="h-12 w-12 text-muted-foreground/40 mx-auto" />
                    <p className="text-sm text-muted-foreground">Camera preview</p>
                  </div>
                  <Badge className="absolute top-3 left-3 bg-destructive/80 text-destructive-foreground text-xs">LIVE</Badge>
                </div>
              </Card>
              <Card>
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1">Interviewing for</p>
                  <p className="font-semibold text-foreground">{role}</p>
                  {industry && <p className="text-sm text-muted-foreground">{industry}</p>}
                  <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setStarted(false); setQuestion(null); setFeedback(null); }}>
                    End Interview
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Question + Answer + Feedback */}
            <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
              {/* AI Question */}
              <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> AI Interviewer</CardTitle>
                </CardHeader>
                <CardContent>
                  {loadingQ ? (
                    <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Thinking of a question...</div>
                  ) : question ? (
                    <div>
                      <Badge variant="secondary" className="mb-2 text-xs">{question.question_type}</Badge>
                      <p className="text-lg font-medium text-foreground leading-relaxed">{question.question}</p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Answer box */}
              {question && !loadingQ && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <Card>
                    <CardContent className="pt-4 space-y-3">
                      <Label>Your Answer</Label>
                      <Textarea placeholder="Type your answer here..." rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className="resize-none" />
                      <div className="flex gap-2">
                        <Button onClick={submitAnswer} disabled={!answer.trim() || loadingF} className="gap-2">
                          {loadingF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                          Submit Answer
                        </Button>
                        <Button variant="outline" onClick={generateQuestion} disabled={loadingQ}>Next Question</Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}

              {/* Feedback / Review */}
              <AnimatePresence>
                {feedback && (
                  <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                    <Card className="border-accent/30 bg-gradient-to-r from-accent/5 to-transparent">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2"><Star className="h-4 w-4 text-accent" /> Performance Review</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">Score</span>
                            <span className="text-2xl font-bold text-accent">{feedback.score}/10</span>
                          </div>
                          <Progress value={feedback.score * 10} className="h-2" />
                        </div>
                        <p className="text-sm text-foreground">{feedback.feedback}</p>
                        {feedback.strengths?.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-accent mb-1">Strengths</p>
                            <ul className="text-sm space-y-1">{feedback.strengths.map((s, i) => <li key={i} className="flex gap-2 text-muted-foreground">✓ {s}</li>)}</ul>
                          </div>
                        )}
                        {feedback.improvements?.length > 0 && (
                          <div>
                            <p className="text-sm font-semibold text-destructive mb-1">To Improve</p>
                            <ul className="text-sm space-y-1">{feedback.improvements.map((s, i) => <li key={i} className="flex gap-2 text-muted-foreground">→ {s}</li>)}</ul>
                          </div>
                        )}
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
