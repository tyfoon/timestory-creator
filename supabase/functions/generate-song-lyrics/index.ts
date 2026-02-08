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

interface SubcultureData {
  myGroup: string | null;
  otherGroupsFromEra: string;
  availableOptions: string[];
}

type Gender = 'male' | 'female' | 'none';

// Extended request body to support both Mode A and Mode B
interface RequestBody {
  // Mode B (full): events are present
  events?: TimelineEvent[];
  summary?: string;
  
  // Mode A (quick): just formData basics
  formData?: {
    birthYear?: number;
    city?: string;
    periodType?: string;
    startYear?: number;
    endYear?: number;
  };
  
  // Shared fields
  personalData?: PersonalData;
  subculture?: SubcultureData;
  gender?: Gender;
  startYear: number;
  endYear: number;
  
  // Mode indicator (optional, inferred from events presence)
  mode?: 'quick' | 'full';
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
    const { events, summary, personalData, subculture, gender, startYear, endYear, formData, mode } = body;

    // Determine which mode we're in
    const isQuickMode = mode === 'quick' || !events || events.length === 0;
    
    console.log(`=== GENERATE SONG LYRICS ===`);
    console.log(`Mode: ${isQuickMode ? 'QUICK (V1 - zonder events)' : 'FULL (V2 - met events)'}`);
    console.log(`Years: ${startYear}-${endYear}`);
    console.log(`Personal data: friends=${personalData?.friends}, school=${personalData?.school}, nightlife=${personalData?.nightlife}`);
    console.log(`Subculture: ${subculture?.myGroup || 'none'}, Gender: ${gender || 'none'}`);
    if (formData) {
      console.log(`FormData: birthYear=${formData.birthYear}, city=${formData.city}, period=${formData.periodType}`);
    }
    if (!isQuickMode && events) {
      console.log(`Events count: ${events.length}`);
    }

    // Determine vocal type based on gender
    let vocalType = "";
    if (gender === 'male') {
      vocalType = "male vocals";
    } else if (gender === 'female') {
      vocalType = "female vocals";
    }

    // Subculture to music style mapping - subculture is the PRIMARY determinant
    const subcultureStyleMap: Record<string, string> = {
      // 1950s
      "Rock 'n' Roll": "1950s Rock 'n' Roll",
      "Nozems": "Nederpop / Rock 'n' Roll",
      "Elvis-fans": "Rockabilly",
      "Beatniks": "Cool Jazz / Beat Poetry",
      "Jazz-cats": "Bebop Jazz",
      
      // 1960s
      "Beatlemania": "British Beat / Merseybeat",
      "Beat-fans": "Beat muziek",
      "Hippies": "Psychedelic Rock / Folk",
      "Provos": "Protestlied / Folk",
      "Mods": "British Mod / Northern Soul",
      "Flower Power": "Psychedelic Pop",
      
      // 1970s
      "Disco-fans": "Disco",
      "Disco": "Disco / Funk",
      "Glamrockers": "Glam Rock",
      "Hardrockers": "Hard Rock / Heavy Metal",
      "Punks": "Punk Rock",
      "Soul/Funk": "Soul / Funk",
      "Krakers": "Punk / New Wave",
      "Northern Soulers": "Northern Soul",
      "ABBA-fans": "Euro Disco / ABBA-style Pop",
      "ABBA-mania": "Euro Disco Pop",
      
      // 1980s
      "Doe Maar-fans": "Nederpop / Ska",
      "Kakkers": "Synthpop / Yuppie Pop",
      "New Wavers": "New Wave / Synthpop",
      "New Romantics": "New Romantic / Synthpop",
      "Metalheads": "Heavy Metal / Thrash",
      "Breakers": "Electro / Breakbeat",
      "B-Boys": "Old School Hip-Hop / Electro",
      "Goths": "Gothic Rock / Darkwave",
      "Gruftis": "Gothic Rock / Dark Wave",
      "Yuppies": "Synthpop / Adult Contemporary",
      "Casuals": "Madchester / Indie",
      "Ravers": "Acid House / Rave",
      "Preppies": "Pop / Soft Rock",
      "Valley Girls": "Synth Pop / Teen Pop",
      "Hair Metalers": "Glam Metal / Hair Metal",
      "Paninari": "Italo Disco / Europop",
      
      // 1990s
      "Gabbers": "Gabber / Hardcore Techno",
      "Gabbertjes": "Happy Hardcore / Gabber",
      "Grunge": "Grunge / Alternative Rock",
      "Grunge-kids": "Grunge / Alternative",
      "Techno/Rave": "Techno / Trance",
      "Hiphoppers": "90s Hip-Hop / Boom Bap",
      "Hip-hop heads": "East Coast Hip-Hop",
      "Gangsta Rap": "West Coast Gangsta Rap",
      "Britpop": "Britpop / Indie Rock",
      "Boybands": "90s Boy Band Pop",
      "Eurodance": "Eurodance / Happy Hardcore",
      "Skaters": "Skate Punk / Pop Punk",
      "Riot Grrrl": "Riot Grrrl / Punk",
      "Love Parade": "Techno / Trance",
      "Raver": "Rave / Trance",
      
      // 2000s
      "Breezers": "R&B / Urban Pop",
      "MSN-generatie": "Pop Punk / Emo Pop",
      "Emo": "Emo / Post-Hardcore",
      "Scene-kids": "Screamo / Metalcore",
      "Jumpstyle": "Jumpstyle / Hardstyle",
      "Indie-sleaze": "Indie Rock / Electro Clash",
      "Hipsters": "Indie / Alternative",
      "Urban/R&B": "R&B / Urban",
      "Tokio Hotel fans": "Emo Rock / Pop Rock",
      "Pop-punk": "Pop Punk",
      "Nu-Metal": "Nu Metal",
      
      // 2010s
      "Vlog-volgers": "EDM / Pop",
      "Fandoms": "K-Pop / Stan Pop",
      "K-pop fans": "K-Pop",
      "K-pop": "K-Pop / Dance Pop",
      "VSCO-girls": "Indie Pop / Chill Pop",
      "Tumblr-kids": "Indie / Alternative",
      "EDM-fans": "EDM / Big Room House",
      "Hipster": "Indie / Folk",
      "Berlin-Techno": "Minimal Techno / Deep House",
      "Klimaat-activisten": "Indie Folk / Protest",
      "FFF-Aktivisten": "Indie / Protest Pop",
      
      // 2020s
      "TikTok-aesthetic": "Hyperpop / TikTok Pop",
      "Gym-bros": "EDM / Hardstyle / Motivational",
      "Gym-cultuur": "EDM / Hardstyle",
      "Drill-rap": "UK Drill / Drill Rap",
      "Drill": "Drill / Trap",
      "Anime-fans": "J-Pop / Anime OST style",
      "Crypto-traders": "Lo-fi / Synthwave",
      "Woke/SJW": "Conscious Hip-Hop / Indie",
      "VTubers": "J-Pop / Electronic / Vocaloid style",
      "Gaming": "Electronic / Chiptune",
    };

    // Get style from subculture first, then fall back to era-based style
    let suggestedStyle = "Pop ballade";
    
    if (subculture?.myGroup && subcultureStyleMap[subculture.myGroup]) {
      suggestedStyle = subcultureStyleMap[subculture.myGroup];
      console.log(`Style determined by subculture "${subculture.myGroup}": ${suggestedStyle}`);
    } else {
      // Fallback: determine by era
      const midYear = Math.round((startYear + endYear) / 2);
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
      console.log(`Style determined by era (${midYear}): ${suggestedStyle}`);
    }

    // Build prompt based on mode
    let systemPrompt: string;
    let userPrompt: string;

    if (isQuickMode) {
      // ============================================
      // MODE A (V1): Quick mode - no events, just basic data
      // ============================================
      const city = formData?.city || personalData?.city;
      const periodDescription = formData?.periodType === 'childhood' ? 'jeugd (ongeveer 6-12 jaar)' 
        : formData?.periodType === 'puberty' ? 'puberteit (ongeveer 12-18 jaar)'
        : formData?.periodType === 'young-adult' ? 'jonge volwassenheid (ongeveer 18-25 jaar)'
        : 'levensfase';
      const subcultureName = subculture?.myGroup || null;
      const birthYearInfo = formData?.birthYear ? `geboren in ${formData.birthYear}` : '';

      systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die nostalgische liedjes schrijft.
Je specialiteit is het oproepen van de sfeer en het gevoel van een bepaald tijdperk met CONCRETE verwijzingen naar de opgegeven locatie en subcultuur.

STIJL: ${suggestedStyle} (periode: ${startYear}-${endYear})
TAAL: Nederlands

STRUCTUUR:
- Couplet 1 (4-6 regels): Schets de tijd en plek - NOEM DE STAD EXPLICIET
- Refrein (4 regels): Emotionele kern, herkenbaar en meezingbaar
- Couplet 2 (4-6 regels): Herinneringen aan de subcultuur/stijl van die tijd
- Refrein (herhaling)
- Bridge (2-4 regels): Reflectie
- Outro/Refrein

REGELS:
1. VERWERK DE STAD (${city || 'niet opgegeven'}) CONCREET in de tekst - noem straten, pleinen, bekende plekken van die stad als je die kent
2. VERWERK DE SUBCULTUUR (${subcultureName || 'niet opgegeven'}) - beschrijf de kleding, muziek, hang-outs, attitude van die groep
3. VERWERK DE PERIODE ${startYear}-${endYear} - noem typische dingen uit die tijd (technologie, mode, muziek, TV-programma's)
4. Focus op de ${periodDescription} - beschrijf hoe het voelde om in die levensfase te zitten
5. Gebruik rijm waar mogelijk, maar forceer het niet
6. De tekst moet geschikt zijn om gezongen te worden (let op lettergrepen)
7. Maak het nostalgisch maar niet té zoetsappig
8. GEEN specifieke nieuwsfeiten of wereldgebeurtenissen - focus op de persoonlijke beleving`;

      userPrompt = `Schrijf een nostalgisch lied voor iemand ${birthYearInfo} over hun ${periodDescription} in de periode ${startYear}-${endYear}.

VERPLICHTE ELEMENTEN (verwerk deze EXPLICIET in de tekst):
${city ? `- STAD: ${city} - noem deze stad bij naam en verwijs naar lokale plekken, sfeer, dialectwoorden indien van toepassing` : '- Geen specifieke stad opgegeven'}
${subcultureName ? `- SUBCULTUUR: ${subcultureName} - beschrijf hun stijl, muziek, kleding, attitude, hang-outs` : '- Geen specifieke subcultuur'}
- TIJDPERK: ${startYear}-${endYear} - verwijs naar mode, muziek, technologie van toen
- LEVENSFASE: ${periodDescription}

Dit is de EERSTE versie van het lied. Later kunnen specifieke herinneringen worden toegevoegd.

BELANGRIJK: De luisteraar moet direct herkennen dat dit over ${city || 'hun stad'} gaat en over de ${subcultureName || 'jeugdcultuur'} van die tijd!

Genereer nu de songtekst in het Nederlands.

Format je output als JSON:
{
  "lyrics": "De volledige songtekst hier...",
  "style": "Korte muziekstijl beschrijving (bijv. '1988 Synthpop met disco invloeden')",
  "title": "Titel van het lied - mag verwijzing naar stad of subcultuur bevatten"
}`;

    } else {
      // ============================================
      // MODE B (V2): Full mode - with events and personal details
      // ============================================
      systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die nostalgische liedjes schrijft.
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

      // Build context from events
      const eventHighlights = events!
        .filter(e => e.category !== 'personal')
        .slice(0, 10)
        .map(e => `- ${e.year}: ${e.title}`)
        .join('\n');

      const personalEvents = events!
        .filter(e => e.category === 'personal')
        .slice(0, 5)
        .map(e => `- ${e.title}`)
        .join('\n');

      userPrompt = `Schrijf een nostalgisch lied voor iemand geboren/opgegroeid in de periode ${startYear}-${endYear}.

PERSOONLIJKE INFORMATIE:
${personalData?.firstName ? `- Naam: ${personalData.firstName}` : ''}
${personalData?.city ? `- Stad: ${personalData.city}` : ''}
${personalData?.friends ? `- Beste vrienden: ${personalData.friends}` : ''}
${personalData?.school ? `- School: ${personalData.school}` : ''}
${personalData?.nightlife ? `- Favoriete uitgaansgelegenheden: ${personalData.nightlife}` : ''}

BELANGRIJKE GEBEURTENISSEN UIT DIE TIJD:
${eventHighlights}

${personalEvents ? `PERSOONLIJKE MIJLPALEN:\n${personalEvents}` : ''}

SAMENVATTING VAN DE PERIODE:
${summary || 'Geen samenvatting beschikbaar'}

Genereer nu de songtekst in het Nederlands. Geef ook een korte beschrijving van de muziekstijl (max 10 woorden) die past bij dit lied.

Format je output als JSON:
{
  "lyrics": "De volledige songtekst hier...",
  "style": "Korte muziekstijl beschrijving (bijv. '1988 Synthpop met disco invloeden')",
  "title": "Titel van het lied"
}`;
    }

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

    // Combine style with vocal type for Suno
    let finalStyle = parsedContent.style;
    if (vocalType) {
      finalStyle = `${parsedContent.style}, ${vocalType}`;
    }

    console.log(`Generated song: "${parsedContent.title}" in style "${finalStyle}"`);
    console.log(`Mode used: ${isQuickMode ? 'QUICK (V1)' : 'FULL (V2)'}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        lyrics: parsedContent.lyrics,
        style: finalStyle,
        title: parsedContent.title,
        suggestedGenre: suggestedStyle,
        mode: isQuickMode ? 'quick' : 'full',
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