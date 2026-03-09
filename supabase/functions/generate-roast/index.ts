import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { events, formData, intensity, language } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Build event summary for the roast
    const eventSummary = (events || [])
      .slice(0, 25)
      .map((e: any) => `${e.year}: ${e.title}`)
      .join("\n");

    const birthYear = formData?.birthDate?.year || "onbekend";
    const firstName = formData?.optionalData?.firstName || "";
    const city = formData?.optionalData?.city || "";

    const intensityLabels: Record<number, string> = {
      1: "Mild en vriendelijk – licht plagend, alsof een lieve oma het zegt",
      2: "Licht pittig – subtiele humor, zachte steken onder water",
      3: "Gemiddeld – duidelijk grappig, eerlijk maar niet gemeen",
      4: "Scherp – bijtende humor, niets is heilig maar nog steeds met een knipoog",
      5: "Extreem – genadeloos, brute eerlijkheid, keihard maar hilarisch",
    };

    const intensityLevel = Math.min(5, Math.max(1, intensity || 3));
    const intensityDesc = intensityLabels[intensityLevel];

    const lang = language === "nl" ? "Nederlands" : language === "en" ? "English" : language === "de" ? "Deutsch" : "Nederlands";

    const systemPrompt = `Je bent een briljante roast-comedian. Je schrijft een roast van iemands leven op basis van de tijdlijn-gebeurtenissen uit hun leven/periode. 

REGELS:
- Schrijf EXACT 80-120 woorden, niet meer, niet minder.
- Schrijf in het ${lang}.
- De roast gaat over de PERSOON die deze gebeurtenissen meemaakte, niet over de gebeurtenissen zelf.
- Gebruik de gebeurtenissen als materiaal om grappen over te maken.
- Intensiteitsniveau: ${intensityDesc}
- Geen internet-afkortingen (LOL, OMG, LMAO etc).
- Geen uitroeptekens overmatig gebruiken (max 2).
- Geen emoji's.
- Schrijf als doorlopende tekst, geen opsommingen.
- ${intensityLevel <= 2 ? "Eindig met iets hartelijks." : intensityLevel >= 4 ? "Eindig met een ultieme burn." : "Eindig met een grappige conclusie."}`;

    const userPrompt = `Roast het leven van ${firstName || "deze persoon"}${city ? ` uit ${city}` : ""}, geboren in ${birthYear}.

Hier zijn de belangrijkste gebeurtenissen uit hun leven/periode:
${eventSummary}

Schrijf nu de roast (intensiteit: ${intensityLevel}/5 - ${intensityDesc}).`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded, probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op, voeg credits toe." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const roastText = data.choices?.[0]?.message?.content || "";

    return new Response(JSON.stringify({ success: true, roast: roastText.trim() }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-roast error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
