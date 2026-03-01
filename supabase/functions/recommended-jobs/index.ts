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
        max_tokens: 3000,
        messages: [{
          role: "user",
          content: `Based on this student/graduate profile, recommend 8-10 specific real job/internship openings they should apply for RIGHT NOW.

Profile:
${profileSummary || "No profile data provided - suggest popular graduate programmes across finance, tech, and consulting."}

IMPORTANT — match_score calculation:
You MUST assign each job a match_score (0-100) that reflects how well the candidate's SPECIFIC skills, degree, and experience match the role requirements:
- 85-99: Direct match — their degree/skills are exactly what the role requires
- 70-84: Strong match — most of their background is relevant  
- 55-69: Moderate match — some transferable skills but not a direct fit
- 40-54: Stretch — would need significant upskilling
- Below 40: Weak match — only tangentially related

Each job MUST have a DIFFERENT match_score. Do NOT give all jobs similar scores.

Return ONLY valid JSON array, no markdown. Each object must have:
- "company": company name (string)
- "role": specific role/programme title (string)  
- "level": one of "Internship", "Graduate", "Junior", "Mid-Level", "Senior" (string)
- "location": city or "Remote" (string)
- "salary": estimated salary range e.g. "£25,000 - £35,000" or "Competitive" (string)
- "logo_url": use "https://logo.clearbit.com/{company domain}" for the company logo (string)
- "url": real application URL (string)
- "match_reason": one sentence why this is a good fit referencing their SPECIFIC background (string)
- "match_score": 0-100 calculated as described above (number)
- "category": one of "Finance", "Technology", "Consulting", "Law", "Other" (string)

Return real companies with real career page URLs. Make sure logo_url uses the correct company domain.`
        }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Claude API error: ${response.status} - ${err}`);
    }

    const data = await response.json();
    const text = (data.content?.[0]?.text || "").trim();
    
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
