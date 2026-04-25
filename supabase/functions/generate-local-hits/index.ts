import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const LANG_NAME: Record<string, string> = {
  nl: "Dutch",
  en: "English",
  de: "German",
  fr: "French",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startYear, endYear, city, language } = await req.json();

    if (!startYear || !endYear || !city) {
      return new Response(
        JSON.stringify({ error: "Missing startYear, endYear, or city" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const lang = (language as string) || "nl";
    const langName = LANG_NAME[lang] || "Dutch";

    const prompt = `You are a music expert. For the city "${city}", provide the most popular hits per year from ${startYear} to ${endYear}.

First determine the country based on the city. Then for each year provide EXACTLY 5 hits that were popular IN THAT COUNTRY (not only international hits, but especially local artists from that country).

Examples:
- Dutch cities: André Hazes, Marco Borsato, Doe Maar, Golden Earring, Volumia!, etc.
- German cities: Nena, Die Ärzte, Falco, Herbert Grönemeyer, etc.
- French cities: Serge Gainsbourg, Édith Piaf, MC Solaar, Mylène Farmer, Indochine, etc.
- Belgian cities: Clouseau, K3, Helmut Lotti, etc.
- US cities: Madonna, Michael Jackson, Beyoncé, Taylor Swift, etc.
- UK cities: The Beatles, Oasis, Adele, Coldplay, etc.

Mix local artists with international hits popular in that country.

CRITICAL: The "country" field MUST be written in ${langName} (e.g. for nl=Frankrijk, en=France, de=Frankreich, fr=France). Artist names and song titles stay in their original form.

Respond ONLY with a JSON object in this exact format, NO other text:
{
  "country": "country name in ${langName}",
  "hits": {
    "${startYear}": [
      {"artist": "Artist", "title": "Title"},
      {"artist": "Artist", "title": "Title"},
      {"artist": "Artist", "title": "Title"},
      {"artist": "Artist", "title": "Title"},
      {"artist": "Artist", "title": "Title"}
    ]
  }
}

All years from ${startYear} to ${endYear}. Exactly 5 hits per year. JSON only, no markdown.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || "";

    let jsonStr = content;
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) {
      jsonStr = jsonMatch[1].trim();
    }

    const parsed = JSON.parse(jsonStr);

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating local hits:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
