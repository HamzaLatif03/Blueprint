import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Video, VideoOff, Star, Loader2, Sparkles, Trophy, Zap, ArrowRight, RotateCcw, User, BookOpen, Brain, ChevronUp, ChevronDown } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useGamification } from "@/hooks/useGamification";
import { XPPopup } from "@/components/XPPopup";
import { useAuth } from "@/hooks/useAuth";

import { BACKEND_URL } from "@/config/backend";

const fadeUp = { hidden: { opacity: 0, y: 24 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } };
const stagger = { visible: { transition: { staggerChildren: 0.1 } } };

const FILLER_WORDS = ["um", "uh", "like", "you know", "basically", "actually", "literally", "right", "so", "well"];

const CATEGORIES = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "situational", label: "Situational" },
  { value: "competency", label: "Competency" },
];

interface Persona {
  name: string;
  age?: number;
  occupation: string;
  interview_style?: string;
}

interface PracticeFeedback {
  score: number;
  pass: boolean;
  tip: string;
}

interface StarComponent {
  present: boolean;
  quality: string;
  feedback: string;
}

interface VocabUpgrade {
  original: string;
  suggested: string;
}

interface ReviewFeedback {
  score: number;
  pass: boolean;
  star_analysis?: {
    situation: StarComponent;
    task: StarComponent;
    action: StarComponent;
    result: StarComponent;
  };
  vocabulary?: {
    current_level: string;
    upgrades: VocabUpgrade[];
    score: number;
  };
  missing_elements?: string[];
  improved_answer?: string;
  top_strengths?: string[];
  areas_to_improve?: string[];
  tip: string;
}

type FeedbackData = {
  feedback: PracticeFeedback | ReviewFeedback;
  thinking_mode: string;
  tokens_used: number;
  model_used: string;
};

const MockInterviews = () => {
  const { awardXP, unlockAchievement, xpPopup } = useGamification();
  const { user } = useAuth();

  // Setup state
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [category, setCategory] = useState("behavioral");
  const [difficulty, setDifficulty] = useState([3]);
  const [thinkingMode, setThinkingMode] = useState<"practice" | "review">("practice");

  // Session state
  const [started, setStarted] = useState(false);
  const [question, setQuestion] = useState<string | null>(null);
  const [questionCategory, setQuestionCategory] = useState("");
  const [persona, setPersona] = useState<Persona | null>(null);
  const [companyContext, setCompanyContext] = useState<string | null>(null);
  const [answer, setAnswer] = useState("");
  const [feedbackData, setFeedbackData] = useState<FeedbackData | null>(null);
  const [loadingQ, setLoadingQ] = useState(false);
  const [loadingF, setLoadingF] = useState(false);
  const [questionCount, setQuestionCount] = useState(0);
  const [sessionXP, setSessionXP] = useState(0);
  const [totalTokens, setTotalTokens] = useState(0);
  const [cameraOn, setCameraOn] = useState(true);
  const [showImprovedAnswer, setShowImprovedAnswer] = useState(false);
  const [backendOnline, setBackendOnline] = useState<boolean | null>(null);

  // Speech tracking
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const committedTranscriptRef = useRef("");
  const speechStartTimeRef = useRef<number | null>(null);
  const fillerCountRef = useRef(0);

  // Audio recording for backend transcription
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStreamRef = useRef<MediaStream | null>(null);

  // Webcam
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Health check
  useEffect(() => {
    fetch(`${BACKEND_URL}/health`)
      .then((r) => r.json())
      .then((d) => setBackendOnline(d.status === "ok"))
      .catch(() => setBackendOnline(false));
  }, []);

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch {
      toast.error("Could not access camera. Check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  // Count filler words in text
  const countFillers = (text: string): number => {
    const lower = text.toLowerCase();
    return FILLER_WORDS.reduce((count, word) => {
      const regex = new RegExp(`\\b${word}\\b`, "gi");
      return count + (lower.match(regex)?.length || 0);
    }, 0);
  };

  const toggleListening = useCallback(async () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      // Stop audio recording
      mediaRecorderRef.current?.stop();
      setIsListening(false);
      setAnswer((prev) => prev.replace(/\s*\[…\]$/, ""));
      return;
    }

    // Start audio recording alongside speech recognition
    audioChunksRef.current = [];
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = audioStream;
      const recorder = new MediaRecorder(audioStream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
    } catch {
      console.warn("Could not start audio recording — will fall back to text.");
    }

    committedTranscriptRef.current = answer;
    speechStartTimeRef.current = Date.now();
    fillerCountRef.current = 0;

    const startRecognition = () => {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-GB";

      recognition.onresult = (event: any) => {
        let final = "";
        let interim = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript + " ";
          } else {
            interim += transcript;
          }
        }
        if (final.trim()) {
          fillerCountRef.current += countFillers(final);
          committedTranscriptRef.current = (committedTranscriptRef.current ? committedTranscriptRef.current + " " : "") + final.trim();
          setAnswer(committedTranscriptRef.current);
        } else if (interim) {
          setAnswer(committedTranscriptRef.current + (committedTranscriptRef.current ? " " : "") + "[…]");
        }
      };

      recognition.onerror = (e: any) => {
        if (e.error !== "aborted" && e.error !== "no-speech") {
          recognitionRef.current = null;
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (recognitionRef.current === recognition) {
          try {
            const fresh = startRecognition();
            recognitionRef.current = fresh;
          } catch {
            setIsListening(false);
          }
        }
      };

      recognition.start();
      return recognition;
    };

    const rec = startRecognition();
    recognitionRef.current = rec;
    setIsListening(true);
    toast.success("🎙️ Listening... speak your answer!");
  }, [isListening, answer]);

  const generateQuestion = async () => {
    setLoadingQ(true);
    setFeedbackData(null);
    setAnswer("");
    setShowImprovedAnswer(false);
    committedTranscriptRef.current = "";
    try {
      const res = await fetch(`${BACKEND_URL}/api/generate-question`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          difficulty: difficulty[0],
          user_id: user?.id || "",
          company,
          role,
        }),
      });
      if (!res.ok) throw new Error("Backend error");
      const data = await res.json();
      setQuestion(data.question || "Tell me about a challenge you overcame.");
      setQuestionCategory(data.category || category);
      setPersona(data.persona || null);
      setCompanyContext(data.company_context || null);
      setQuestionCount((c) => c + 1);
    } catch {
      toast.error("Could not reach backend. Using fallback question.");
      setQuestion("Tell me about a time you had to learn something new quickly.");
      setQuestionCategory(category);
      setPersona({ name: "AI Interviewer", occupation: "General" });
    }
    setLoadingQ(false);
  };

  const submitAnswer = async () => {
    if (!answer.trim() || !question) return;
    if (isListening) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }

    // Stop audio recording and collect blob
    const audioBlob = await new Promise<Blob | null>((resolve) => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          // Stop audio stream tracks
          audioStreamRef.current?.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
          resolve(blob.size > 0 ? blob : null);
        };
        mediaRecorderRef.current.stop();
      } else {
        resolve(null);
      }
    });
    mediaRecorderRef.current = null;

    const cleanAnswer = answer.replace(/\s*\[…\]$/, "");
    const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
    const durationSec = speechStartTimeRef.current ? (Date.now() - speechStartTimeRef.current) / 1000 : 60;
    const wpm = durationSec > 0 ? Math.round((wordCount / durationSec) * 60) : 0;
    const fillerWords = fillerCountRef.current + countFillers(cleanAnswer);

    setLoadingF(true);
    try {
      let res: Response;

      if (audioBlob) {
        // Send audio to dedicated audio endpoint
        const formData = new FormData();
        formData.append('audio', audioBlob, 'answer.webm');
        formData.append('question_text', question);
        formData.append('thinking_mode', thinkingMode);
        formData.append('persona_name', persona?.name || 'Interviewer');
        res = await fetch(`${BACKEND_URL}/api/evaluate-audio`, {
          method: "POST",
          body: formData,
        });
      } else {
        // Fallback: send text transcript
        res = await fetch(`${BACKEND_URL}/api/evaluate-answer`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript: cleanAnswer,
            question_text: question,
            thinking_mode: thinkingMode,
            persona_name: persona?.name || "Interviewer",
            audio_duration_seconds: durationSec,
            filler_words: fillerWords,
            wpm,
          }),
        });
      }
      if (!res.ok) throw new Error("Backend error");
      const data: FeedbackData = await res.json();
      setFeedbackData(data);
      setTotalTokens((t) => t + (data.tokens_used || 0));

      const score = data.feedback?.score || 50;
      const xp = Math.max(10, Math.round(score / 10) * 10);
      setSessionXP((t) => t + xp);
      await awardXP(xp, "Interview Practice", `Score: ${score}/100 for ${role}`);
      if (questionCount === 1) await unlockAchievement("first_interview_practice");
      if (questionCount >= 10) await unlockAchievement("ten_interviews");
      if (score >= 90) await unlockAchievement("perfect_score");
    } catch {
      toast.error("Could not get feedback. Try again.");
      setFeedbackData({
        feedback: { score: 65, pass: true, tip: "Good effort. Try adding more specifics." },
        thinking_mode: thinkingMode,
        tokens_used: 0,
        model_used: "fallback",
      });
      setSessionXP((t) => t + 30);
      await awardXP(30, "Interview Practice");
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
    if (cameraOn) { stopCamera(); setCameraOn(false); }
    else { startCamera(); setCameraOn(true); }
  }, [cameraOn, startCamera, stopCamera]);

  const endInterview = () => {
    stopCamera();
    if (isListening) { recognitionRef.current?.stop(); recognitionRef.current = null; setIsListening(false); }
    // Clean up audio recording
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    audioStreamRef.current = null;
    audioChunksRef.current = [];
    setStarted(false);
    setQuestion(null);
    setFeedbackData(null);
    setQuestionCount(0);
    setSessionXP(0);
    setTotalTokens(0);
    setPersona(null);
    setCompanyContext(null);
    setShowImprovedAnswer(false);
  };

  useEffect(() => {
    return () => {
      stopCamera();
      recognitionRef.current?.stop();
      mediaRecorderRef.current?.stop();
      audioStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [stopCamera]);

  const fb = feedbackData?.feedback;
  const isReview = feedbackData?.thinking_mode === "review";
  const reviewFb = isReview ? (fb as ReviewFeedback) : null;
  const scoreColor = (s: number) => s >= 75 ? "text-accent" : s >= 50 ? "text-[hsl(var(--xp-bar))]" : "text-destructive";
  const scoreEmoji = (s: number) => s >= 85 ? "🔥" : s >= 65 ? "💪" : s >= 50 ? "👍" : "📝";
  const starQualityColor = (q: string) => q === "good" ? "text-accent" : q === "fair" ? "text-[hsl(var(--xp-bar))]" : "text-destructive";

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
          <div className="flex items-center gap-3 flex-wrap">
            {backendOnline !== null && (
              <Badge variant={backendOnline ? "default" : "destructive"} className="gap-1.5">
                <span className={`h-2 w-2 rounded-full ${backendOnline ? "bg-accent animate-pulse" : "bg-destructive-foreground"}`} />
                {backendOnline ? "Backend Online" : "Backend Offline"}
              </Badge>
            )}
            {started && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex gap-2">
                <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-bold">
                  <Zap className="h-4 w-4 text-[hsl(var(--xp-bar))]" /> {sessionXP} XP
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-bold">
                  <Trophy className="h-4 w-4 text-[hsl(var(--level))]" /> Q{questionCount}
                </div>
                <div className="flex items-center gap-2 px-4 py-2 rounded-full glass text-sm font-bold">
                  <Brain className="h-4 w-4 text-primary" /> {totalTokens} tokens
                </div>
              </motion.div>
            )}
          </div>
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
                    <Input id="role" placeholder="e.g. Graduate Software Engineer" value={role} onChange={(e) => setRole(e.target.value)} className="h-12 text-base" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="company" className="font-semibold">Company (optional)</Label>
                    <Input id="company" placeholder="e.g. Google — triggers company research" value={company} onChange={(e) => setCompany(e.target.value)} className="h-12 text-base" />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label className="font-semibold">Category</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger className="h-12 text-base">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="font-semibold">Difficulty: {difficulty[0]}/5</Label>
                    <Slider min={1} max={5} step={1} value={difficulty} onValueChange={setDifficulty} className="mt-3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="font-semibold">Feedback Mode</Label>
                  <Tabs value={thinkingMode} onValueChange={(v) => setThinkingMode(v as "practice" | "review")}>
                    <TabsList className="w-full sm:w-auto">
                      <TabsTrigger value="practice" className="gap-2"><Zap className="h-4 w-4" /> Practice (Fast)</TabsTrigger>
                      <TabsTrigger value="review" className="gap-2"><BookOpen className="h-4 w-4" /> Review (Deep)</TabsTrigger>
                    </TabsList>
                  </Tabs>
                  <p className="text-xs text-muted-foreground">
                    {thinkingMode === "practice" ? "Quick score + tip in 1-3 seconds" : "Full STAR breakdown, vocabulary upgrades & improved answer in 5-15 seconds"}
                  </p>
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
                <CardContent className="pt-4 space-y-3">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Interviewing for</p>
                  <p className="font-bold text-lg text-foreground">{role}</p>
                  <div className="flex gap-2 flex-wrap">
                    {company && <Badge variant="secondary">{company}</Badge>}
                    <Badge variant="outline" className="capitalize">{category}</Badge>
                    <Badge variant="outline">Difficulty {difficulty[0]}/5</Badge>
                    <Badge variant="outline" className="capitalize">{thinkingMode} mode</Badge>
                  </div>

                  {/* Persona */}
                  {persona && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-semibold text-sm">{persona.name}</p>
                        <p className="text-xs text-muted-foreground">{persona.occupation}</p>
                      </div>
                    </motion.div>
                  )}

                  {companyContext && (
                    <div className="text-xs text-muted-foreground bg-primary/5 p-2 rounded-lg border border-primary/10">
                      <span className="font-semibold text-primary">Company insight:</span> {companyContext}
                    </div>
                  )}

                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button variant="outline" size="sm" className="w-full gap-2" onClick={endInterview}>
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
                    {persona ? `${persona.name} — ${persona.occupation}` : "AI Interviewer"}
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
                      <Badge variant="outline" className="mb-3 text-xs font-bold uppercase tracking-wider border-primary/30 text-primary">{questionCategory}</Badge>
                      <p className="text-lg font-semibold text-foreground leading-relaxed">{question}</p>
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
                            {thinkingMode === "review" ? "Deep Review" : "Submit"}
                          </Button>
                        </motion.div>
                        <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                          <Button variant={isListening ? "destructive" : "outline"} onClick={toggleListening} className="gap-2 font-bold">
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

              {/* Feedback */}
              <AnimatePresence>
                {feedbackData && fb && (
                  <motion.div initial={{ opacity: 0, scale: 0.9, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ type: "spring", duration: 0.5 }}>
                    <Card className="card-glow overflow-hidden relative">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-accent/60" />
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Star className="h-5 w-5 text-accent" /> Performance Review {scoreEmoji(fb.score)}
                        </CardTitle>
                        <div className="flex gap-2">
                          <Badge variant={fb.pass ? "default" : "destructive"}>{fb.pass ? "PASS ✅" : "NEEDS WORK"}</Badge>
                          <Badge variant="outline" className="capitalize">{feedbackData.thinking_mode} mode</Badge>
                          <Badge variant="secondary">{feedbackData.tokens_used} tokens</Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-5">
                        {/* Score */}
                        <div className="flex items-center gap-6">
                          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }} className={`text-5xl font-black ${scoreColor(fb.score)}`}>
                            {fb.score}
                          </motion.div>
                          <div className="flex-1 space-y-2">
                            <div className="flex justify-between text-sm">
                              <span className="font-medium">Score</span>
                              <span className="text-muted-foreground">{fb.score}/100</span>
                            </div>
                            <div className="h-3 rounded-full bg-muted overflow-hidden">
                              <motion.div className="h-full rounded-full xp-gradient" initial={{ width: 0 }} animate={{ width: `${fb.score}%` }} transition={{ duration: 0.8, delay: 0.3 }} />
                            </div>
                          </div>
                        </div>

                        {/* Tip */}
                        <p className="text-sm text-foreground leading-relaxed bg-primary/5 p-3 rounded-lg border border-primary/10">
                          💡 {fb.tip}
                        </p>

                        {/* STAR Analysis (Review mode) */}
                        {reviewFb?.star_analysis && (
                          <div className="space-y-3">
                            <h4 className="font-bold text-sm flex items-center gap-2"><Star className="h-4 w-4 text-primary" /> STAR Analysis</h4>
                            <div className="grid gap-2 sm:grid-cols-2">
                              {(["situation", "task", "action", "result"] as const).map((key) => {
                                const item = reviewFb.star_analysis![key];
                                return (
                                  <motion.div key={key} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="p-3 rounded-lg border bg-card">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="font-bold text-xs uppercase tracking-wider">{key}</span>
                                      <Badge variant={item.present ? "default" : "destructive"} className="text-xs">
                                        {item.present ? item.quality : "missing"}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{item.feedback}</p>
                                  </motion.div>
                                );
                              })}
                            </div>
                          </div>
                        )}

                        {/* Vocabulary Upgrades (Review) */}
                        {reviewFb?.vocabulary && reviewFb.vocabulary.upgrades.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="font-bold text-sm flex items-center gap-2">📚 Vocabulary ({reviewFb.vocabulary.current_level})</h4>
                            <div className="flex gap-2 flex-wrap">
                              {reviewFb.vocabulary.upgrades.map((u, i) => (
                                <Badge key={i} variant="outline" className="gap-1 text-xs">
                                  <span className="line-through text-muted-foreground">{u.original}</span>
                                  <ArrowRight className="h-3 w-3" />
                                  <span className="text-primary font-bold">{u.suggested}</span>
                                </Badge>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Strengths & Improvements (Review) */}
                        {reviewFb && (
                          <div className="grid gap-4 sm:grid-cols-2">
                            {reviewFb.top_strengths && reviewFb.top_strengths.length > 0 && (
                              <div className="rounded-xl bg-accent/5 border border-accent/20 p-4">
                                <p className="text-sm font-bold text-accent mb-2">✅ Strengths</p>
                                <ul className="text-sm space-y-1.5">
                                  {reviewFb.top_strengths.map((s, i) => (
                                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-muted-foreground">• {s}</motion.li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {reviewFb.areas_to_improve && reviewFb.areas_to_improve.length > 0 && (
                              <div className="rounded-xl bg-destructive/5 border border-destructive/20 p-4">
                                <p className="text-sm font-bold text-destructive mb-2">🎯 To Improve</p>
                                <ul className="text-sm space-y-1.5">
                                  {reviewFb.areas_to_improve.map((s, i) => (
                                    <motion.li key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + i * 0.1 }} className="text-muted-foreground">• {s}</motion.li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Improved Answer (Review) */}
                        {reviewFb?.improved_answer && (
                          <div className="space-y-2">
                            <Button variant="ghost" size="sm" className="gap-2 text-sm" onClick={() => setShowImprovedAnswer(!showImprovedAnswer)}>
                              {showImprovedAnswer ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                              {showImprovedAnswer ? "Hide" : "Show"} Improved Answer
                            </Button>
                            <AnimatePresence>
                              {showImprovedAnswer && (
                                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                                  <div className="p-4 rounded-lg bg-accent/5 border border-accent/20 text-sm text-foreground leading-relaxed">
                                    {reviewFb.improved_answer}
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        )}

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
