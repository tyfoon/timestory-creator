import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { startYear, endYear, city, chunkStart, chunkEnd } = await req.json();

    const actualStart = chunkStart || startYear;
    const actualEnd = chunkEnd || endYear;

    if (!actualStart || !actualEnd) {
      return new Response(
        JSON.stringify({ error: "Missing startYear/endYear or chunkStart/chunkEnd" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const cityContext = city
      ? `De gebruiker woont in "${city}". Bepaal het land en geef een mix van internationale blockbusters EN lokale/nationale producties die in dat land populair waren (bijv. voor Nederland: Flodder, Baantjer, Goede Tijden Slechte Tijden, Turks Fruit, etc.).`
      : `Geef de meest iconische internationale TV-series en films per jaar.`;

    const prompt = `Je bent een film- en TV-expert. ${cityContext}

Geef per jaar van ${actualStart} tot ${actualEnd} EXACT 5 items: een mix van TV-series en films die dat jaar populair/iconisch waren.

Antwoord ALLEEN met een JSON object in dit exacte formaat, GEEN andere tekst:
{
  "country": "${city ? 'bepaal het land' : 'Internationaal'}",
  "items": {
    "${actualStart}": [
      {"title": "Titel", "type": "film", "description": "Korte beschrijving in 1 zin"},
      {"title": "Titel", "type": "tv", "description": "Korte beschrijving in 1 zin"}
    ]
  }
}

type is "film" of "tv". Geef ALLE jaren van ${actualStart} t/m ${actualEnd}. Exact 5 items per jaar. Alleen JSON, geen markdown.`;

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
    console.error("Error generating TV/films:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
