import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { interests, background, degree_type, education, work_experience, bio } = await req.json();
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const want = degree_type || "both";

  // Build profile context for meaningful matching
  const profileParts = [
    interests ? `Interests: ${interests}` : "",
    background ? `Background: ${background}` : "",
    education?.length ? `Education: ${education.map((e: any) => `${e.degree || ""} ${e.field_of_study || ""} at ${e.university}`).join("; ")}` : "",
    work_experience?.length ? `Work experience: ${work_experience.map((w: any) => `${w.role || ""} at ${w.company}`).join("; ")}` : "",
    bio ? `Bio: ${bio}` : "",
  ].filter(Boolean).join("\n");

  const systemPrompt = `You suggest postgraduate programmes. You MUST calculate match_pct accurately based on how well the candidate's profile matches each programme.

MATCHING RULES for match_pct:
- 90-99: Programme directly aligns with their degree field, interests, AND work experience
- 75-89: Strong overlap — programme matches their interests and at least one of degree/experience
- 60-74: Moderate fit — some relevant skills or interests but not a direct match
- 40-59: Tangential — loosely related to their background
- Below 40: Weak match — only include if very few alternatives exist

Each programme MUST have a DIFFERENT match_pct reflecting genuine differences in fit. Do NOT give all programmes similar scores.

Reply with a JSON array of 4-6 objects: {"name": "...", "institution": "...", "degree_type": "PhD|Masters", "match_pct": 0-100, "focus": "...", "location": "...", "url": "..."}. The "url" field MUST be the real official programme page URL. Only output the JSON array. ${want !== "both" ? `ONLY suggest ${want} programmes.` : ""}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{
        role: "user",
        content: `Candidate profile:\n${profileParts || "Interests: " + interests}\n\nLooking for: ${want}\n\nSuggest 4-6 specific programmes that match. Calculate match_pct based on how well each programme fits their SPECIFIC background.`,
      }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Anthropic error:", res.status, errText);
    return new Response(JSON.stringify({ programmes: [] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const data = await res.json();
  const text = data.content?.[0]?.text || "";
  const arrMatch = text.match(/\[[\s\S]*\]/);
  let programmes = [];
  try {
    programmes = arrMatch ? JSON.parse(arrMatch[0]) : [];
  } catch {
    programmes = [];
  }

  programmes.sort((a: any, b: any) => (b.match_pct || 0) - (a.match_pct || 0));

  if (want !== "both") {
    const filter = want.toLowerCase();
    programmes = programmes.filter((p: any) => p.degree_type?.toLowerCase().includes(filter));
  }

  return new Response(JSON.stringify({ programmes }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
