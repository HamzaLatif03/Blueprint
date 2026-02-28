import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const { interests, background, degree_type } = await req.json();
  const apiKey = Deno.env.get("LOVABLE_API_KEY");

  const want = degree_type || "both";

  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages: [
        {
          role: "system",
          content: "You suggest postgraduate programmes. Reply with a JSON array of 4-6 objects: {\"name\": \"...\", \"institution\": \"...\", \"degree_type\": \"PhD|Masters\", \"match_pct\": 0-100, \"focus\": \"...\", \"location\": \"...\"}. Only output the JSON array.",
        },
        {
          role: "user",
          content: `Interests: "${interests}"\nBackground: "${background || "Not specified"}"\nLooking for: ${want}\n\nSuggest 4-6 specific programmes that match.`,
        },
      ],
      temperature: 0.7,
    }),
  });

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  const arrMatch = text.match(/\[[\s\S]*\]/);
  let programmes = [];
  try {
    programmes = arrMatch ? JSON.parse(arrMatch[0]) : [];
  } catch {
    programmes = [];
  }

  return new Response(JSON.stringify({ programmes }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
