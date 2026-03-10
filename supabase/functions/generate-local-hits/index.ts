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
    const { startYear, endYear, city } = await req.json();

    if (!startYear || !endYear || !city) {
      return new Response(
        JSON.stringify({ error: "Missing startYear, endYear, or city" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const prompt = `Je bent een muziekexpert. Geef voor de stad "${city}" de populairste hits per jaar van ${startYear} tot ${endYear}.

Bepaal eerst het land op basis van de stad. Geef dan per jaar EXACT 5 hits die in DAT LAND populair waren (niet alleen internationale hits, maar juist ook lokale artiesten uit dat land).

Voorbeelden:
- Voor Nederlandse steden: André Hazes, Marco Borsato, Doe Maar, Golden Earring, Volumia!, etc.
- Voor Duitse steden: Nena, Die Ärzte, Falco, Herbert Grönemeyer, etc.
- Voor Franse steden: Serge Gainsbourg, Édith Piaf, MC Solaar, etc.
- Voor Belgische steden: Clouseau, K3, Helmut Lotti, etc.

Mix lokale artiesten met internationale hits die in dat land populair waren.

Antwoord ALLEEN met een JSON object in dit exacte formaat, GEEN andere tekst:
{
  "country": "Nederland",
  "hits": {
    "${startYear}": [
      {"artist": "Artiest", "title": "Titel"},
      {"artist": "Artiest", "title": "Titel"},
      {"artist": "Artiest", "title": "Titel"},
      {"artist": "Artiest", "title": "Titel"},
      {"artist": "Artiest", "title": "Titel"}
    ]
  }
}

Geef ALLE jaren van ${startYear} t/m ${endYear}. Exact 5 hits per jaar. Alleen JSON, geen markdown.`;

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

    // Extract JSON from response (might be wrapped in markdown)
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
