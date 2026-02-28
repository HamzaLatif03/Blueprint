import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { action, role, industry, question, answer } = await req.json();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  let systemPrompt = "";
  let userPrompt = "";

  if (action === "generate_question") {
    systemPrompt = "You are an expert interviewer. Generate exactly one interview question. Reply with JSON: {\"question\": \"...\", \"question_type\": \"behavioral|technical|situational\"}";
    userPrompt = `Generate an interview question for role: "${role || "general"}", industry: "${industry || "general"}". Make it specific and challenging.`;
  } else if (action === "get_feedback") {
    systemPrompt = `You are a supportive and encouraging interview coach. Evaluate the candidate's answer generously — focus on what they did well and give constructive suggestions. Be kind but honest. Scores should reflect genuine effort: a reasonable attempt should score 6-7, a good answer 7-8, and only truly poor answers below 5. Most answers from someone genuinely trying should land between 6-9. Reply with JSON: {"score": 1-10, "feedback": "...", "strengths": ["..."], "improvements": ["..."]}`;
    userPrompt = `Question: "${question}"\nAnswer: "${answer}"\nRole: "${role || "general"}"\n\nRate this answer generously and provide encouraging, actionable feedback.`;
  }

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  let parsed = {};
  try {
    parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { question: text, question_type: "general" };
  } catch {
    parsed = action === "generate_question"
      ? { question: text, question_type: "general" }
      : { score: 7, feedback: text, strengths: [], improvements: [] };
  }

  return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
});
