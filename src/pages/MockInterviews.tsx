import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Video, VideoOff, Star, Loader2, Sparkles, Trophy, Zap, ArrowRight, RotateCcw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useGamification } from "@/hooks/useGamification";
import { XPPopup } from "@/components/XPPopup";
import { XPBar } from "@/components/XPBar";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const MockInterviews = () => {
  const { awardXP, unlockAchievement, xpPopup } = useGamification();
  const [role, setRole] = useState("");
  const [industry, setIndustry] = useState("");
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<{ question: string; question_type: string } | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedback, setFeedback] = useState<{ score: number; feedback: string; strengths: string[]; improvements: string[] } | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingF, setLoadingF] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);

  // Webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Speech-to-text
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      toast.error("Could not access camera. Check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const toggleListening = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
      setAnswer((prev) => prev.replace(/\s*\[…\]$/, ""));
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-GB";

    recognition.onresult = (event: any) => {
      let final = "";
      let interim = "";
      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + " ";
        } else {
          interim += transcript;
        }
      }
      setAnswer((prev) => {
        const base = prev.replace(/\s*\[…\]$/, "");
        if (final.trim()) return (base ? base + " " : "") + final.trim();
        if (interim) return (base ? base + " " : "") + "[…]";
        return base;
      });
    };

    recognition.onerror = (e: any) => {
      if (e.error !== "aborted") setIsListening(false);
    };

    recognition.onend = () => {
      // Restart if still supposed to be listening (browser auto-stops)
      if (recognitionRef.current === recognition) {
        try { recognition.start(); } catch { setIsListening(false); }
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
    toast.success("🎙️ Listening... speak your answer!");
  }, [isListening, answer]);

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
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
    setLoadingF(true);
    try {
      const { data } = await supabase.functions.invoke("interview-ai", {
        body: { action: "get_feedback", question: question.question, answer, role },
      });
      setFeedback(data);
      const xp = Math.max(10, (data?.score || 5) * 10);
      setSessionXP((t) => t + xp);
      await awardXP(xp, "Interview Practice", `Score: ${data?.score}/10 for ${role}`);
      if (questionCount === 1) await unlockAchievement("first_interview_practice");
      if (questionCount >= 10) await unlockAchievement("ten_interviews");
      if (data?.score >= 10) await unlockAchievement("perfect_score");
    } catch { 
      setFeedback({ score: 7, feedback: "Good effort. Try adding more specifics.", strengths: ["Clear communication"], improvements: ["Add metrics"] }); 
      setSessionXP((t) => t + 70);
      await awardXP(70, "Interview Practice");
    }
    setLoadingF(false);
  };

  const startInterview = () => {
    if (!role.trim()) return;
    setStarted(true);
    if (cameraOn) startCamera();
    generateQuestion();
  };

  const toggleCamera = useCallback(() => {
    if (cameraOn) {
      stopCamera();
      setCameraOn(false);
    } else {
      startCamera();
      setCameraOn(true);
    }
  }, [cameraOn, startCamera, stopCamera]);

  const endInterview = () => {
    stopCamera();
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
    setStarted(false);
    setQuestion(null);
    setFeedback(null);
    setQuestionCount(0);
    setSessionXP(0);
  };

  useEffect(() => {
    return () => { stopCamera(); recognitionRef.current?.stop(); };
  }, [stopCamera]);

  const scoreColor = (s: number) => s >= 8 ? "text-accent" : s >= 5 ? "text-[hsl(var(--xp-bar))]" : "text-destructive";
  const scoreEmoji = (s: number) => s >= 9 ? "🔥" : s >= 7 ? "💪" : s >= 5 ? "👍" : "📝";

  return (
    <motion.div className="max-w-6xl mx-auto" initial="hidden" animate="visible" variants={stagger}>
      <XPPopup xpPopup={xpPopup} />
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
                {sessionXP} XP
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
                <CardDescription>Tell us about the role — we'll tailor the questions to you. Your webcam and mic will be used.</CardDescription>
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
            {/* Camera */}
            <motion.div variants={fadeUp} className="lg:col-span-2 space-y-4">
              <Card className="overflow-hidden card-glow">
                <div className="aspect-video bg-gradient-to-br from-muted via-muted/80 to-primary/5 relative overflow-hidden">
                  {cameraOn && <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover absolute inset-0" />}
                  {!cameraOn && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <VideoOff className="h-10 w-10 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="absolute top-3 left-3 flex gap-2 z-10">
                    {cameraOn && (
                      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }}>
                        <Badge className="bg-destructive text-destructive-foreground text-xs gap-1 animate-pulse">
                          <span className="h-1.5 w-1.5 rounded-full bg-destructive-foreground" /> LIVE
                        </Badge>
                      </motion.div>
                    )}
                  </div>
                  <div className="absolute top-3 right-3 z-10">
                    <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full opacity-80 hover:opacity-100" onClick={toggleCamera}>
                      {cameraOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-muted">
                    <motion.div className="h-full xp-gradient rounded-r-full" animate={{ width: `${Math.min(100, sessionXP / 5)}%` }} transition={{ duration: 0.5 }} />
                  </div>
                </div>
              </Card>
              <Card className="card-glow">
                <CardContent className="pt-4">
                  <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider font-semibold">Interviewing for</p>
                  <p className="font-bold text-lg text-foreground">{role}</p>
                  {industry && <Badge variant="secondary" className="mt-1">{industry}</Badge>}
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="sm" className="mt-4 w-full gap-2" onClick={endInterview}>
                      <RotateCcw className="h-3.5 w-3.5" /> End & Reset
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Question + Answer + Feedback */}
            <motion.div variants={fadeUp} className="lg:col-span-3 space-y-4">
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

              {question && !loadingQ && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                  <Card className="card-glow">
                    <CardContent className="pt-5 space-y-4">
                      <Label className="font-semibold text-base">Your Answer ✍️</Label>
                      <Textarea placeholder="Type your answer or use the mic button to speak..." rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} className="resize-none text-base" />
                      <div className="flex gap-2 flex-wrap">
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button onClick={submitAnswer} disabled={!answer.trim() || loadingF} className="gap-2 font-bold">
                            {loadingF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                            Submit for Review
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button
                            variant={isListening ? "destructive" : "outline"}
                            onClick={toggleListening}
                            className="gap-2 font-bold"
                          >
                            {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                            {isListening ? "Stop Listening" : "Use Mic 🎙️"}
                          </Button>
                        </motion.div>
                        <Button variant="outline" onClick={generateQuestion} disabled={loadingQ} className="gap-2">
                          <ArrowRight className="h-4 w-4" /> Skip / Next
                        </Button>
                      </div>
                      {isListening && (
                        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 text-sm text-destructive font-medium">
                          <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                          Listening... speak now
                        </motion.div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              )}

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
