import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");
    if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY not configured");

    const { education, work_experience, bio } = await req.json();

    const profileSummary = [
      bio ? `Bio: ${bio}` : "",
      education?.length ? `Education: ${education.map((e: any) => `${e.degree || ""} ${e.field_of_study || ""} at ${e.university}`).join("; ")}` : "",
      work_experience?.length ? `Experience: ${work_experience.map((w: any) => `${w.role || ""} at ${w.company}`).join("; ")}` : "",
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{
          role: "user",
          content: `Based on this student/graduate profile, recommend 6-8 specific real job/internship openings they should apply for RIGHT NOW. Focus on well-known companies and real programme types.

Profile:
${profileSummary || "No profile data provided - suggest popular graduate programmes across finance, tech, and consulting."}

Return ONLY valid JSON array, no markdown. Each object must have:
- "company": company name (string)
- "role": specific role/programme title (string)
- "url": real application URL - use the actual careers page URL for that company's graduate/internship programme (string)
- "match_reason": one sentence why this is a good fit (string)
- "category": one of "Finance", "Technology", "Consulting", "Law", "Other" (string)
- "deadline_hint": approximate deadline or "Rolling" (string)

Return real companies with real career page URLs. Prefer companies actively hiring graduates/interns.`
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = data.content[0].text.trim();
    
    let jobs;
    try {
      jobs = JSON.parse(text);
    } catch {
      const match = text.match(/\[[\s\S]*\]/);
      jobs = match ? JSON.parse(match[0]) : [];
    }

    return new Response(JSON.stringify({ jobs }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
