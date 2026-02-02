import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface TimelineEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: string;
}

interface PersonalData {
  friends?: string;
  school?: string;
  nightlife?: string;
  firstName?: string;
  city?: string;
}

interface RequestBody {
  events: TimelineEvent[];
  summary: string;
  personalData: PersonalData;
  startYear: number;
  endYear: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { events, summary, personalData, startYear, endYear } = body;

    console.log(`Generating song lyrics for ${events.length} events, years ${startYear}-${endYear}`);
    console.log(`Personal data: friends=${personalData.friends}, school=${personalData.school}, nightlife=${personalData.nightlife}`);

    // Determine music style based on era
    const midYear = Math.round((startYear + endYear) / 2);
    let suggestedStyle = "Pop ballade";
    if (midYear >= 1975 && midYear < 1985) {
      suggestedStyle = "Synthpop/New Wave";
    } else if (midYear >= 1985 && midYear < 1992) {
      suggestedStyle = "Eurodance/Hi-NRG";
    } else if (midYear >= 1992 && midYear < 2000) {
      suggestedStyle = "Eurodance/Happy Hardcore";
    } else if (midYear >= 2000 && midYear < 2010) {
      suggestedStyle = "Pop/R&B";
    } else if (midYear >= 2010) {
      suggestedStyle = "EDM/Dance Pop";
    } else if (midYear >= 1965 && midYear < 1975) {
      suggestedStyle = "Rock/Nederpop";
    }

    // Build context from events
    const eventHighlights = events
      .filter(e => e.category !== 'personal')
      .slice(0, 10)
      .map(e => `- ${e.year}: ${e.title}`)
      .join('\n');

    const personalEvents = events
      .filter(e => e.category === 'personal')
      .slice(0, 5)
      .map(e => `- ${e.title}`)
      .join('\n');

    const systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die nostalgische liedjes schrijft.
Je specialiteit is het verweven van persoonlijke herinneringen met historische gebeurtenissen tot een emotioneel en herkenbaar lied.

STIJL: ${suggestedStyle} (periode: ${startYear}-${endYear})
TAAL: Nederlands

STRUCTUUR:
- Couplet 1 (4-6 regels): Schets de tijd en setting
- Refrein (4 regels): Emotionele kern, herkenbaar en meezingbaar
- Couplet 2 (4-6 regels): Persoonlijke herinneringen
- Refrein (herhaling)
- Bridge (2-4 regels): Reflectie
- Outro/Refrein

REGELS:
1. Weef SPECIFIEKE details door de tekst (namen van vrienden, plekken, gebeurtenissen)
2. Gebruik rijm waar mogelijk, maar forceer het niet
3. De tekst moet geschikt zijn om gezongen te worden (let op lettergrepen)
4. Maak het nostalgisch maar niet té zoetsappig
5. Verwijs naar minstens 3 historische gebeurtenissen uit de lijst
6. Noem de persoonlijke details (vrienden, school, uitgaansleven) als die gegeven zijn`;

    const userPrompt = `Schrijf een nostalgisch lied voor iemand geboren/opgegroeid in de periode ${startYear}-${endYear}.

PERSOONLIJKE INFORMATIE:
${personalData.firstName ? `- Naam: ${personalData.firstName}` : ''}
${personalData.city ? `- Stad: ${personalData.city}` : ''}
${personalData.friends ? `- Beste vrienden: ${personalData.friends}` : ''}
${personalData.school ? `- School: ${personalData.school}` : ''}
${personalData.nightlife ? `- Favoriete uitgaansgelegenheden: ${personalData.nightlife}` : ''}

BELANGRIJKE GEBEURTENISSEN UIT DIE TIJD:
${eventHighlights}

${personalEvents ? `PERSOONLIJKE MIJLPALEN:\n${personalEvents}` : ''}

SAMENVATTING VAN DE PERIODE:
${summary}

Genereer nu de songtekst in het Nederlands. Geef ook een korte beschrijving van de muziekstijl (max 10 woorden) die past bij dit lied.

Format je output als JSON:
{
  "lyrics": "De volledige songtekst hier...",
  "style": "Korte muziekstijl beschrijving (bijv. '1988 Synthpop met disco invloeden')",
  "title": "Titel van het lied"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`AI gateway error: ${response.status}`, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Te veel verzoeken. Probeer het later opnieuw." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits op. Voeg credits toe aan je workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;
    
    if (!content) {
      throw new Error("No content in AI response");
    }

    console.log("AI Response received, parsing...");

    // Parse JSON from response (handle markdown code blocks)
    let parsedContent;
    try {
      // Remove markdown code blocks if present
      const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      parsedContent = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error("Failed to parse AI response as JSON:", content);
      // Fallback: try to extract lyrics from raw text
      parsedContent = {
        lyrics: content,
        style: suggestedStyle,
        title: `Mijn ${startYear}-${endYear}`,
      };
    }

    console.log(`Generated song: "${parsedContent.title}" in style "${parsedContent.style}"`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        lyrics: parsedContent.lyrics,
        style: parsedContent.style,
        title: parsedContent.title,
        suggestedGenre: suggestedStyle,
      }
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("generate-song-lyrics error:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : "Onbekende fout bij het genereren van songtekst",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});