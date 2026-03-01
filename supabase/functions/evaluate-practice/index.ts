import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { transcript, question_text, audio_duration_seconds, filler_words, wpm } = await req.json();

    if (!transcript?.trim()) {
      return new Response(JSON.stringify({
        feedback: { score: 0, pass: false, tip: "No answer was provided." },
        thinking_mode: "practice",
        tokens_used: 0,
        model_used: "none",
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const prompt = `You are an expert interview evaluator. Rate this interview answer ACCURATELY based on its actual quality.

INTERVIEW QUESTION: "${question_text}"

CANDIDATE'S ANSWER: "${transcript}"

Speech metrics: ${wpm || 0} words per minute, ${filler_words || 0} filler words, ${Math.round(audio_duration_seconds || 0)}s duration.

SCORING RULES — follow these strictly:
- 0-20: No relevant answer, off-topic, or nonsensical
- 21-40: Vaguely related but misses the question, very generic
- 41-55: Addresses the question but lacks specifics, no examples
- 56-70: Decent answer with some specifics but missing structure or depth
- 71-85: Good answer with clear examples and reasonable structure
- 86-100: Excellent answer with STAR structure, specific metrics, and compelling narrative

IMPORTANT: 
- A short or lazy answer MUST score below 50
- An answer that doesn't address the question MUST score below 30
- Only answers with specific examples and good structure should score above 70
- The tip MUST be specific to THIS answer, not generic advice

Return ONLY valid JSON, no markdown:
{"score": <number 0-100>, "pass": <true if score >= 50>, "tip": "<one specific sentence of actionable advice based on what was actually said>"}`;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 200,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Claude error:", response.status, errText);
      throw new Error(`Claude API error: ${response.status}`);
    }

    const data = await response.json();
    const text = data.content?.[0]?.text || "";
    const tokensUsed = data.usage?.output_tokens || 0;

    let feedback;
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      feedback = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      feedback = null;
    }

    if (!feedback || typeof feedback.score !== "number") {
      feedback = { score: 50, pass: true, tip: text.slice(0, 200) || "Try to be more specific in your answer." };
    }

    feedback.pass = feedback.score >= 50;

    return new Response(JSON.stringify({
      feedback,
      thinking_mode: "practice",
      tokens_used: tokensUsed,
      model_used: "claude-sonnet-4",
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({
      feedback: { score: 50, pass: true, tip: "Could not evaluate. Try again." },
      thinking_mode: "practice",
      tokens_used: 0,
      model_used: "fallback",
    }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
