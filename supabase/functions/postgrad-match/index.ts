import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { interests, background, degree_type } = await req.json();
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return new Response(JSON.stringify({ error: "ANTHROPIC_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  const want = degree_type || "both";

  const systemPrompt = `You suggest postgraduate programmes. Reply with a JSON array of 4-6 objects: {"name": "...", "institution": "...", "degree_type": "PhD|Masters", "match_pct": 0-100, "focus": "...", "location": "...", "url": "..."}. The "url" field MUST be the real official programme page URL from the institution's website. Only output the JSON array. ${want !== "both" ? `ONLY suggest ${want} programmes, do NOT include any other type.` : ""}`;

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
        content: `Interests: "${interests}"\nBackground: "${background || "Not specified"}"\nLooking for: ${want}\n\nSuggest 4-6 specific programmes that match.`,
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
