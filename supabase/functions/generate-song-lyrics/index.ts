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

// Helper function to generate nuanced style tags based on gender and birth year
function getNuancedStyleTags(gender: Gender, birthYear?: number): { mood: string[], texture: string[] } {
  const mood: string[] = [];
  const texture: string[] = [];

  // Mood tags based on gender
  if (gender === 'male') {
    mood.push('anthemic', 'driving', 'energetic');
  } else if (gender === 'female') {
    mood.push('melodic', 'sentimental', 'warm');
  }

  // Texture tags based on generation (birth year)
  if (birthYear) {
    if (birthYear < 1980) {
      // Gen X
      texture.push('analogue sound', 'raw production');
    } else if (birthYear >= 1980 && birthYear <= 1996) {
      // Millennials
      texture.push('polished', 'radio hit');
    } else if (birthYear > 1996) {
      // Gen Z
      texture.push('lo-fi aesthetics', 'dreamy reverb');
    }
  }

  return { mood, texture };
}

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

    // Get nuanced mood and texture tags based on gender and birth year
    const birthYear = formData?.birthYear;
    const nuancedTags = getNuancedStyleTags(gender || 'none', birthYear);
    const moodTags = nuancedTags.mood.join(', ');
    const textureTags = nuancedTags.texture.join(', ');
    
    console.log(`Nuanced tags - Mood: [${moodTags}], Texture: [${textureTags}]`);

    // Build prompt based on mode
    let systemPrompt: string;
    let userPrompt: string;

    if (isQuickMode) {
      // ============================================
      // MODE A (V1): Quick mode - no events, just basic data
      // Optimized for SHORT songs (max 2 minutes, "radio edit" style)
      // ERA-FIRST approach: accessible, melodic base with subtle subculture influence
      // ============================================
      const city = formData?.city || personalData?.city;
      const periodDescription = formData?.periodType === 'childhood' ? 'jeugd (ongeveer 6-12 jaar)' 
        : formData?.periodType === 'puberty' ? 'puberteit (ongeveer 12-18 jaar)'
        : formData?.periodType === 'young-adult' ? 'jonge volwassenheid (ongeveer 18-25 jaar)'
        : 'levensfase';
      const subcultureName = subculture?.myGroup || null;
      const birthYearInfo = formData?.birthYear ? `geboren in ${formData.birthYear}` : '';

      // ERA-FIRST: Determine accessible base genre from era (NOT from subculture)
      const midYear = Math.round((startYear + endYear) / 2);
      let eraBaseGenre = "Pop";
      if (midYear >= 1955 && midYear < 1965) {
        eraBaseGenre = "50s/60s Pop, Doo-wop";
      } else if (midYear >= 1965 && midYear < 1975) {
        eraBaseGenre = "60s/70s Pop Rock, Folk Pop";
      } else if (midYear >= 1975 && midYear < 1985) {
        eraBaseGenre = "80s Synthpop, Melodic";
      } else if (midYear >= 1985 && midYear < 1995) {
        eraBaseGenre = "90s Eurodance, Pop";
      } else if (midYear >= 1995 && midYear < 2005) {
        eraBaseGenre = "00s Radio Pop, R&B influenced";
      } else if (midYear >= 2005 && midYear < 2015) {
        eraBaseGenre = "2010s Dance Pop, EDM influenced";
      } else if (midYear >= 2015) {
        eraBaseGenre = "Modern Pop, Lo-fi influenced";
      }

      // Map subculture to a SUBTLE influence (not the main genre!)
      const subcultureInfluenceMap: Record<string, string> = {
        // Extreme genres get softened
        "Gabbers": "slight happy hardcore influence",
        "Gabbertjes": "upbeat techno touch",
        "Punks": "raw guitar edge",
        "Krakers": "rebellious folk touch",
        "Metalheads": "power ballad influence",
        "Hardrockers": "melodic rock influence",
        "Goths": "dreamy, atmospheric touch",
        "Gruftis": "dark romantic influence",
        "Emo": "emotional, melodic guitars",
        "Scene-kids": "pop-punk influence",
        "Grunge": "acoustic grunge touch",
        "Grunge-kids": "melancholic guitar feel",
        "Drill-rap": "urban beat influence",
        "Drill": "trap-influenced rhythm",
        "Nu-Metal": "alternative rock edge",
        // Moderate genres keep flavor
        "Hiphoppers": "old school hip-hop groove",
        "Hip-hop heads": "boom bap influence",
        "Disco-fans": "funky disco touch",
        "Disco": "groovy disco feel",
        "New Wavers": "synth-wave influence",
        "Techno/Rave": "electronic dance touch",
        "Raver": "trance-influenced melody",
        "EDM-fans": "festival anthem feel",
        // Already soft genres
        "Hippies": "folk influence",
        "Flower Power": "psychedelic pop touch",
        "Indie-sleaze": "indie rock feel",
        "Hipsters": "indie folk touch",
        "VSCO-girls": "chill acoustic vibe",
      };

      const subcultureInfluence = subcultureName && subcultureInfluenceMap[subcultureName] 
        ? subcultureInfluenceMap[subcultureName] 
        : (subcultureName ? `subtle ${subcultureName.toLowerCase()} influence` : '');

      // Build the ACCESSIBLE style string
      const styleTagsParts = [eraBaseGenre, 'melodic', 'nostalgic', 'radio-friendly'];
      if (subcultureInfluence) styleTagsParts.push(subcultureInfluence);
      if (moodTags) styleTagsParts.push(moodTags);
      if (textureTags) styleTagsParts.push(textureTags);
      const completeStyleTags = styleTagsParts.join(', ');

      console.log(`ERA-FIRST style approach: Base="${eraBaseGenre}", Subculture influence="${subcultureInfluence}"`);
      console.log(`Complete style tags: ${completeStyleTags}`);

      systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die KORTE, PAKKENDE nostalgische liedjes schrijft.
Je specialiteit is compacte "radio edit" nummers die direct to-the-point komen.

=== NOSTALGIE-INSTRUCTIE (BELANGRIJK!) ===
Het doel is NOSTALGIE, niet een karikatuur. Het liedje moet klinken als een RADIO-HIT uit dat jaar die de gebruiker terugbrengt naar die tijd.
De muziekstijl moet herkenbaar zijn voor het GROTE PUBLIEK, maar met een subtiele knipoog naar de gekozen subcultuur.
GEEN extreme genres! Denk aan "Top 40" uit dat decennium, met een vleugje van de subcultuur-sfeer.

STIJL: ${completeStyleTags}
PERIODE: ${startYear}-${endYear}
TAAL: Nederlands
DOEL: Kort nummer van MAX 1:30-2:00 minuten

=== MUZIEKSTIJL INSTRUCTIES (ERA-FIRST) ===
De uiteindelijke "style" tag moet ALTIJD beginnen met een toegankelijk, melodieus genre uit het tijdperk.
De subcultuur is een SUBTIELE invloed, NIET het hoofdgenre.

VOORBEELDEN van correcte style outputs:
- Als Gabber + 90s: "90s Dance Pop, melodic, upbeat, slight happy hardcore influence" (NIET: "Gabber, Hardcore, 180bpm")
- Als Punk + 80s: "80s Pop Rock, energetic, raw vocals, punk edge" (NIET: "Punk, Screaming, Aggressive")  
- Als HipHop + 80s: "80s Pop, groovy, old school hip-hop influence" (NIET: "Gangsta Rap, Street")
- Als Emo + 00s: "00s Pop Rock, emotional, melodic guitars" (NIET: "Screamo, Hardcore")
- Als Metal + 90s: "90s Rock Ballad, powerful, melodic rock influence" (NIET: "Death Metal, Thrash")

=== STRIKTE STRUCTUUR (RADIO EDIT) ===
Gebruik EXACT deze structuur met Suno section tags:

[Short Intro]
(Max 2 regels - direct de sfeer neerzetten, GEEN lange instrumentale opbouw)

[Verse 1]
(PRECIES 4 regels - schets de tijd en plek, NOEM DE STAD)

[Chorus]
(PRECIES 4 regels - pakkend, emotioneel, meezingbaar)

[Verse 2]
(PRECIES 4 regels - herinneringen aan subcultuur/stijl)

[Chorus]
(Herhaling van het refrein)

[Short Outro]
(Max 2 regels - korte afsluiting)

=== STRENG VERBODEN ===
❌ GEEN [Bridge] sectie - dit rekt het nummer te veel
❌ GEEN [Instrumental] of [Interlude] secties
❌ GEEN extreme of agressieve muziekstijlen
❌ GEEN "la la la" of "oh oh oh" opvullers

=== VERPLICHTE ELEMENTEN ===
1. VERWERK DE STAD (${city || 'niet opgegeven'}) CONCREET - noem straten, pleinen, bekende plekken
2. VERWERK DE SUBCULTUUR (${subcultureName || 'niet opgegeven'}) als SFEER, niet als muziekgenre
3. VERWERK DE PERIODE ${startYear}-${endYear} - typische mode, muziek, technologie
4. Focus op de ${periodDescription}
5. Maak het nostalgisch, melodieus en LUISTERBAAR`;

      userPrompt = `Schrijf een KORT nostalgisch lied (max 2 minuten) voor iemand ${birthYearInfo} over hun ${periodDescription} in de periode ${startYear}-${endYear}.

VERPLICHTE ELEMENTEN:
${city ? `- STAD: ${city} - noem bij naam, verwijs naar lokale plekken` : '- Geen stad opgegeven'}
${subcultureName ? `- SUBCULTUUR: ${subcultureName} - verwerk als SFEER en HERINNERINGEN, niet als muziekgenre!` : '- Geen subcultuur'}
- TIJDPERK: ${startYear}-${endYear}
- LEVENSFASE: ${periodDescription}

BELANGRIJK - ERA-FIRST MUZIEKSTIJL:
De style tag moet een TOEGANKELIJKE radio-hit uit ${startYear}-${endYear} zijn, met hooguit een subtiele ${subcultureName || 'persoonlijke'} invloed.
Voorbeeld: "${eraBaseGenre}, melodic, nostalgic${subcultureInfluence ? `, ${subcultureInfluence}` : ''}"

BELANGRIJK - HOUD HET KORT:
- Gebruik de EXACTE structuur: [Short Intro] → [Verse 1] → [Chorus] → [Verse 2] → [Chorus] → [Short Outro]
- GEEN bridge, GEEN instrumentale stukken
- Direct beginnen, geen lange intro

De luisteraar moet direct herkennen dat dit over ${city || 'hun stad'} gaat!

Format je output als JSON:
{
  "lyrics": "De volledige songtekst met [Section Tags]...",
  "style": "${completeStyleTags}",
  "title": "Pakkende korte titel"
}`;

    } else {
      // ============================================
      // MODE B (V2): Full mode - with events and personal details
      // ============================================
      
      // Build the complete style string with mood and texture tags for Mode B
      const styleTagsPartsB = [suggestedStyle];
      if (moodTags) styleTagsPartsB.push(moodTags);
      if (textureTags) styleTagsPartsB.push(textureTags);
      const completeStyleTagsB = styleTagsPartsB.join(', ');

      systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die nostalgische liedjes schrijft.
Je specialiteit is het verweven van persoonlijke herinneringen met historische gebeurtenissen tot een emotioneel en herkenbaar lied.

STIJL: ${completeStyleTagsB} (periode: ${startYear}-${endYear})
TAAL: Nederlands

=== MUZIEKSTIJL INSTRUCTIES ===
De uiteindelijke "style" tag moet deze elementen bevatten:
- Genre: ${suggestedStyle}
${moodTags ? `- Mood: ${moodTags}` : ''}
${textureTags ? `- Texture: ${textureTags}` : ''}

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

Genereer nu de songtekst in het Nederlands.

Format je output als JSON:
{
  "lyrics": "De volledige songtekst hier...",
  "style": "${completeStyleTagsB}",
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