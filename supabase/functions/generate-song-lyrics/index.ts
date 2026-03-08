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

  if (gender === 'male') {
    mood.push('anthemic', 'driving', 'energetic');
  } else if (gender === 'female') {
    mood.push('melodic', 'sentimental', 'warm');
  }

  if (birthYear) {
    if (birthYear < 1980) {
      texture.push('analogue sound', 'raw production');
    } else if (birthYear >= 1980 && birthYear <= 1996) {
      texture.push('polished', 'radio hit');
    } else if (birthYear > 1996) {
      texture.push('lo-fi aesthetics', 'dreamy reverb');
    }
  }

  return { mood, texture };
}

// Language-specific prompt templates
function getLanguageConfig(language: string) {
  if (language === 'en') {
    return {
      langName: 'English',
      langCode: 'en',
      writeInstructions: 'Write all lyrics in English.',
      periodDescriptions: {
        childhood: 'childhood (about 6-12 years old)',
        puberty: 'teenage years (about 12-18 years old)',
        'young-adult': 'young adulthood (about 18-25 years old)',
        default: 'life phase',
      },
      bornIn: 'born in',
      cityLabel: 'CITY',
      subcultureLabel: 'SUBCULTURE',
      periodLabel: 'PERIOD',
      lifePhaseLabel: 'LIFE PHASE',
      noCity: 'No city',
      eraLabel: (decade: number) => `The ${decade}s`,
      personalInfoLabel: 'PERSONAL INFORMATION',
      importantEventsLabel: 'IMPORTANT EVENTS FROM THAT TIME',
      personalMilestonesLabel: 'PERSONAL MILESTONES',
      periodSummaryLabel: 'PERIOD SUMMARY',
      noSummary: 'No summary available',
      generateNow: 'Now generate the lyrics in English.',
      songTitleFallback: (start: number, end: number) => `My ${start}-${end}`,
    };
  }
  // Default: Dutch
  return {
    langName: 'Nederlands',
    langCode: 'nl',
    writeInstructions: 'Schrijf alle teksten in het Nederlands.',
    periodDescriptions: {
      childhood: 'jeugd (ongeveer 6-12 jaar)',
      puberty: 'puberteit (ongeveer 12-18 jaar)',
      'young-adult': 'jonge volwassenheid (ongeveer 18-25 jaar)',
      default: 'levensfase',
    },
    bornIn: 'geboren in',
    cityLabel: 'STAD',
    subcultureLabel: 'SUBCULTUUR',
    periodLabel: 'PERIODE',
    lifePhaseLabel: 'LEVENSFASE',
    noCity: 'Geen stad',
    eraLabel: (decade: number) => `Jaren ${decade}`,
    personalInfoLabel: 'PERSOONLIJKE INFORMATIE',
    importantEventsLabel: 'BELANGRIJKE GEBEURTENISSEN UIT DIE TIJD',
    personalMilestonesLabel: 'PERSOONLIJKE MIJLPALEN',
    periodSummaryLabel: 'SAMENVATTING VAN DE PERIODE',
    noSummary: 'Geen samenvatting beschikbaar',
    generateNow: 'Genereer nu de songtekst in het Nederlands.',
    songTitleFallback: (start: number, end: number) => `Mijn ${start}-${end}`,
  };
}

// Extended request body to support both Mode A and Mode B
interface RequestBody {
  events?: TimelineEvent[];
  summary?: string;
  formData?: {
    birthYear?: number;
    city?: string;
    periodType?: string;
    startYear?: number;
    endYear?: number;
  };
  personalData?: PersonalData;
  subculture?: SubcultureData;
  gender?: Gender;
  startYear: number;
  endYear: number;
  mode?: 'quick' | 'full';
  provider?: 'suno' | 'acestep' | 'diffrhythm';
  language?: string; // 'nl' | 'en'
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const body: RequestBody = await req.json();
    const { events, summary, personalData, subculture, gender, startYear, endYear, formData, mode, provider, language } = body;

    // Get language config (default to Dutch)
    const lang = getLanguageConfig(language || 'nl');

    const isQuickMode = mode === 'quick' || !events || events.length === 0;
    
    console.log(`=== GENERATE SONG LYRICS ===`);
    console.log(`Mode: ${isQuickMode ? 'QUICK (V1)' : 'FULL (V2)'}`);
    console.log(`Language: ${lang.langName}`);
    console.log(`Years: ${startYear}-${endYear}`);
    console.log(`Personal data: friends=${personalData?.friends}, school=${personalData?.school}, nightlife=${personalData?.nightlife}`);
    console.log(`Subculture: ${subculture?.myGroup || 'none'}, Gender: ${gender || 'none'}`);
    if (formData) {
      console.log(`FormData: birthYear=${formData.birthYear}, city=${formData.city}, period=${formData.periodType}`);
    }
    if (!isQuickMode && events) {
      console.log(`Events count: ${events.length}`);
    }

    let vocalType = "";
    if (gender === 'male') {
      vocalType = "male vocals";
    } else if (gender === 'female') {
      vocalType = "female vocals";
    }

    // Subculture to music style mapping
    const subcultureStyleMap: Record<string, string> = {
      "Rock 'n' Roll": "1950s Rock 'n' Roll",
      "Nozems": "Nederpop / Rock 'n' Roll",
      "Elvis-fans": "Rockabilly",
      "Beatniks": "Cool Jazz / Beat Poetry",
      "Jazz-cats": "Bebop Jazz",
      "Beatlemania": "British Beat / Merseybeat",
      "Beat-fans": "Beat muziek",
      "Hippies": "Psychedelic Rock / Folk",
      "Provos": "Protestlied / Folk",
      "Mods": "British Mod / Northern Soul",
      "Flower Power": "Psychedelic Pop",
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

    let suggestedStyle = "Pop ballade";
    
    if (subculture?.myGroup && subcultureStyleMap[subculture.myGroup]) {
      suggestedStyle = subcultureStyleMap[subculture.myGroup];
      console.log(`Style determined by subculture "${subculture.myGroup}": ${suggestedStyle}`);
    } else {
      const midYear = Math.round((startYear + endYear) / 2);
      if (midYear >= 1965 && midYear < 1972) {
        suggestedStyle = "Rock/Nederpop";
      } else if (midYear >= 1972 && midYear < 1980) {
        suggestedStyle = "Disco/Funk/Soft Rock";
      } else if (midYear >= 1980 && midYear < 1988) {
        suggestedStyle = "Synthpop/New Wave";
      } else if (midYear >= 1988 && midYear < 1996) {
        suggestedStyle = "Eurodance/Hi-NRG";
      } else if (midYear >= 1996 && midYear < 2005) {
        suggestedStyle = "Eurodance/Happy Hardcore";
      } else if (midYear >= 2005 && midYear < 2015) {
        suggestedStyle = "Pop/R&B";
      } else if (midYear >= 2015) {
        suggestedStyle = "EDM/Dance Pop";
      }
      console.log(`Style determined by era (${midYear}): ${suggestedStyle}`);
    }

    const birthYear = formData?.birthYear;
    const nuancedTags = getNuancedStyleTags(gender || 'none', birthYear);
    const moodTags = nuancedTags.mood.join(', ');
    const textureTags = nuancedTags.texture.join(', ');
    
    console.log(`Nuanced tags - Mood: [${moodTags}], Texture: [${textureTags}]`);

    let systemPrompt: string;
    let userPrompt: string;

    if (isQuickMode) {
      // ============================================
      // MODE A (V1): Quick mode - no events, just basic data
      // ============================================
      const city = formData?.city || personalData?.city;
      const periodDescription = lang.periodDescriptions[formData?.periodType as keyof typeof lang.periodDescriptions] || lang.periodDescriptions.default;
      const subcultureName = subculture?.myGroup || null;
      const birthYearInfo = formData?.birthYear ? `${lang.bornIn} ${formData.birthYear}` : '';

      const midYear = Math.round((startYear + endYear) / 2);
      let eraBaseGenre = "Pop";
      if (midYear >= 1955 && midYear < 1965) {
        eraBaseGenre = "50s/60s Pop, Doo-wop";
      } else if (midYear >= 1965 && midYear < 1972) {
        eraBaseGenre = "60s/70s Pop Rock, Folk Pop";
      } else if (midYear >= 1972 && midYear < 1980) {
        eraBaseGenre = "70s Disco, Funk, Soft Rock";
      } else if (midYear >= 1980 && midYear < 1988) {
        eraBaseGenre = "80s Synthpop, Melodic";
      } else if (midYear >= 1988 && midYear < 1996) {
        eraBaseGenre = "90s Eurodance, Pop";
      } else if (midYear >= 1996 && midYear < 2005) {
        eraBaseGenre = "00s Radio Pop, R&B influenced";
      } else if (midYear >= 2005 && midYear < 2015) {
        eraBaseGenre = "2010s Dance Pop, EDM influenced";
      } else if (midYear >= 2015) {
        eraBaseGenre = "Modern Pop, Lo-fi influenced";
      }

      const subcultureInfluenceMap: Record<string, string> = {
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
        "Hiphoppers": "old school hip-hop groove",
        "Hip-hop heads": "boom bap influence",
        "Disco-fans": "funky disco touch",
        "Disco": "groovy disco feel",
        "New Wavers": "synth-wave influence",
        "Techno/Rave": "electronic dance touch",
        "Raver": "trance-influenced melody",
        "EDM-fans": "festival anthem feel",
        "Hippies": "folk influence",
        "Flower Power": "psychedelic pop touch",
        "Indie-sleaze": "indie rock feel",
        "Hipsters": "indie folk touch",
        "VSCO-girls": "chill acoustic vibe",
      };

      const subcultureInfluence = subcultureName && subcultureInfluenceMap[subcultureName] 
        ? subcultureInfluenceMap[subcultureName] 
        : (subcultureName ? `subtle ${subcultureName.toLowerCase()} influence` : '');

      const styleTagsParts = [eraBaseGenre, 'melodic', 'nostalgic', 'radio-friendly'];
      if (subcultureInfluence) styleTagsParts.push(subcultureInfluence);
      if (moodTags) styleTagsParts.push(moodTags);
      if (textureTags) styleTagsParts.push(textureTags);
      const completeStyleTags = styleTagsParts.join(', ');

      console.log(`ERA-FIRST style approach: Base="${eraBaseGenre}", Subculture influence="${subcultureInfluence}"`);
      console.log(`Complete style tags: ${completeStyleTags}`);

      if (lang.langCode === 'en') {
        systemPrompt = `You are a talented songwriter who writes ULTRA-SHORT nostalgic songs.
Your specialty is MICRO-SONGS of maximum 1 minute 30 seconds that instantly evoke emotion.

=== CRITICAL: LENGTH LIMIT ===
The MAXIMUM duration is 1:30 (90 seconds). This means EXTREMELY little text.
Suno generates approximately 15-20 words per 10 seconds.
So your TOTAL lyrics must NOT exceed 120-150 words!

=== NOSTALGIA INSTRUCTION ===
The goal is NOSTALGIA with a radio-hit sound from that era.
The music style should be recognizable for a BROAD AUDIENCE, with a subtle nod to the subculture.

STYLE: ${completeStyleTags}
PERIOD: ${startYear}-${endYear}
LANGUAGE: English

=== MUSIC STYLE (ERA-FIRST) ===
Style tag always starts with accessible, melodic genre from the era.
Subculture is a SUBTLE influence, NOT the main genre.

=== ULTRA-STRICT STRUCTURE (MAX 1:30) ===
Use EXACTLY this minimal structure:

[Intro]
(Literally 1 line of max 8 words - set the mood immediately)

[Verse]
(EXACTLY 3 short lines - sketch time, place, mention the city)

[Chorus]
(EXACTLY 3 short lines - catchy, emotional)

[Verse 2]
(EXACTLY 3 short lines - memories)

[Chorus]
(Repeat - IDENTICAL to first chorus)

[Outro]
(1 line - short closing)

=== STRICTLY FORBIDDEN ===
❌ NO Bridge section
❌ NO Instrumental or Interlude
❌ NO extra verses
❌ NO long lines (max 10 words per line)
❌ NO repetition of words within lines

=== REQUIRED ELEMENTS ===
1. CITY ${city || 'not specified'} mentioned concretely
2. SUBCULTURE ${subcultureName || 'not specified'} woven in as atmosphere
3. PERIOD ${startYear}-${endYear} made recognizable
4. Total MAX 120 words`;

        userPrompt = `Write an ULTRA-SHORT nostalgic song (MAXIMUM 1:30 minutes, max 120 words total) for someone ${birthYearInfo} about their ${periodDescription}.

REQUIRED ELEMENTS:
${city ? `- CITY: ${city} - mention by name` : '- No city'}
${subcultureName ? `- SUBCULTURE: ${subcultureName} - weave in as atmosphere` : ''}
- ERA: ${startYear}-${endYear}
- LIFE PHASE: ${periodDescription}

CRITICAL - ULTRA-SHORT:
- EXACT structure: [Intro](1 line) → [Verse](3 lines) → [Chorus](3 lines) → [Verse 2](3 lines) → [Chorus](3 lines) → [Outro](1 line)
- MAXIMUM 120 words total
- Short, punchy lines of max 10 words
- NO bridge, NO extra sections

ERA-FIRST STYLE:
"${eraBaseGenre}, fast tempo, punchy, radio edit, short song, spoken word delivery${subcultureInfluence ? `, ${subcultureInfluence}` : ''}"

Format your output as JSON:
{
  "lyrics": "The full lyrics with [Section Tags]...",
  "style": "${eraBaseGenre}, fast tempo, punchy, radio edit, short song, spoken word delivery${subcultureInfluence ? `, ${subcultureInfluence}` : ''}, ${vocalType}",
  "title": "Short title (max 3 words)"
}`;
      } else {
        // Dutch (original)
        systemPrompt = `Je bent een getalenteerde Nederlandse songwriter die ULTRA-KORTE nostalgische liedjes schrijft.
Je specialiteit is MICRO-SONGS van maximaal 1 minuut 30 seconden die direct emotie oproepen.

=== KRITISCH: LENGTE LIMIET ===
De MAXIMALE duur is 1:30 (90 seconden). Dit betekent EXTREEM weinig tekst.
Suno genereert ongeveer 15-20 woorden per 10 seconden.
Dus je TOTALE lyrics mogen NIET meer dan 120-150 woorden bevatten!

=== NOSTALGIE-INSTRUCTIE ===
Het doel is NOSTALGIE met een radio-hit sound uit dat jaar.
De muziekstijl moet herkenbaar zijn voor het GROTE PUBLIEK, met een subtiele knipoog naar de subcultuur.

STIJL: ${completeStyleTags}
PERIODE: ${startYear}-${endYear}
TAAL: Nederlands

=== MUZIEKSTIJL (ERA-FIRST) ===
Style tag begint ALTIJD met toegankelijk, melodieus genre uit het tijdperk.
Subcultuur is een SUBTIELE invloed, NIET het hoofdgenre.

=== ULTRA-STRIKTE STRUCTUUR (MAX 1:30) ===
Gebruik EXACT deze minimale structuur:

[Intro]
(Letterlijk 1 regel van max 8 woorden - direct de sfeer)

[Verse]
(PRECIES 3 korte regels - schets tijd, plek, noem de stad)

[Chorus]
(PRECIES 3 korte regels - pakkend, emotioneel)

[Verse 2]
(PRECIES 3 korte regels - herinneringen)

[Chorus]
(Herhaling - IDENTIEK aan eerste chorus)

[Outro]
(1 regel - korte afsluiting)

=== STRENG VERBODEN ===
❌ GEEN Bridge sectie
❌ GEEN Instrumental of Interlude
❌ GEEN extra coupletten
❌ GEEN lange regels (max 10 woorden per regel)
❌ GEEN herhalingen van woorden binnen regels

=== VERPLICHTE ELEMENTEN ===
1. STAD ${city || 'niet opgegeven'} concreet noemen
2. SUBCULTUUR ${subcultureName || 'niet opgegeven'} als sfeer verwerken
3. PERIODE ${startYear}-${endYear} herkenbaar maken
4. Totaal MAX 120 woorden`;

        userPrompt = `Schrijf een ULTRA-KORT nostalgisch lied (MAXIMAAL 1:30 minuut, max 120 woorden totaal) voor iemand ${birthYearInfo} over hun ${periodDescription}.

VERPLICHTE ELEMENTEN:
${city ? `- STAD: ${city} - noem bij naam` : '- Geen stad'}
${subcultureName ? `- SUBCULTUUR: ${subcultureName} - verwerk als sfeer` : ''}
- TIJDPERK: ${startYear}-${endYear}
- LEVENSFASE: ${periodDescription}

KRITISCH - ULTRA-KORT:
- EXACTE structuur: [Intro](1 regel) → [Verse](3 regels) → [Chorus](3 regels) → [Verse 2](3 regels) → [Chorus](3 regels) → [Outro](1 regel)
- MAXIMAAL 120 woorden totaal
- Korte, punchy regels van max 10 woorden
- GEEN bridge, GEEN extra secties

ERA-FIRST STIJL:
"${eraBaseGenre}, fast tempo, punchy, radio edit, short song, spoken word delivery${subcultureInfluence ? `, ${subcultureInfluence}` : ''}"

Format je output als JSON:
{
  "lyrics": "De volledige songtekst met [Section Tags]...",
  "style": "${eraBaseGenre}, fast tempo, punchy, radio edit, short song, spoken word delivery${subcultureInfluence ? `, ${subcultureInfluence}` : ''}, ${vocalType}",
  "title": "Korte titel (max 3 woorden)"
}`;
      }

    } else {
      // ============================================
      // MODE B (V2): Full mode - with events and personal details
      // ============================================
      
      const styleTagsPartsB = [suggestedStyle];
      if (moodTags) styleTagsPartsB.push(moodTags);
      if (textureTags) styleTagsPartsB.push(textureTags);
      const completeStyleTagsB = styleTagsPartsB.join(', ');

      if (lang.langCode === 'en') {
        systemPrompt = `You are a talented songwriter who writes nostalgic songs.
Your specialty is weaving personal memories with historical events into an emotional and recognizable song.

STYLE: ${completeStyleTagsB} (period: ${startYear}-${endYear})
LANGUAGE: English

=== MUSIC STYLE INSTRUCTIONS ===
The final "style" tag should contain these elements:
- Genre: ${suggestedStyle}
${moodTags ? `- Mood: ${moodTags}` : ''}
${textureTags ? `- Texture: ${textureTags}` : ''}

STRUCTURE:
- Verse 1 (4-6 lines): Set the scene and era
- Chorus (4 lines): Emotional core, catchy and singable
- Verse 2 (4-6 lines): Personal memories
- Chorus (repeat)
- Bridge (2-4 lines): Reflection
- Outro/Chorus

RULES:
1. Weave SPECIFIC details through the lyrics (names of friends, places, events)
2. Use rhyme where possible, but don't force it
3. The lyrics must be suitable for singing (mind the syllables)
4. Make it nostalgic but not too sappy
5. Reference at least 3 historical events from the list
6. Mention personal details (friends, school, nightlife) if provided`;

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

        userPrompt = `Write a nostalgic song for someone born/growing up in the period ${startYear}-${endYear}.

PERSONAL INFORMATION:
${personalData?.firstName ? `- Name: ${personalData.firstName}` : ''}
${personalData?.city ? `- City: ${personalData.city}` : ''}
${personalData?.friends ? `- Best friends: ${personalData.friends}` : ''}
${personalData?.school ? `- School: ${personalData.school}` : ''}
${personalData?.nightlife ? `- Favorite venues: ${personalData.nightlife}` : ''}

IMPORTANT EVENTS FROM THAT TIME:
${eventHighlights}

${personalEvents ? `PERSONAL MILESTONES:\n${personalEvents}` : ''}

PERIOD SUMMARY:
${summary || 'No summary available'}

Now generate the lyrics in English.

Format your output as JSON:
{
  "lyrics": "The full lyrics here...",
  "style": "${completeStyleTagsB}",
  "title": "Song title"
}`;
      } else {
        // Dutch (original)
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
    }

    // === STAP 2: DiffRhythm LRC timestamp mode ===
    const isDiffRhythm = provider === 'diffrhythm';
    if (isDiffRhythm) {
      console.log('[DiffRhythm mode] Building LRC lyrics');

      const midYear = Math.round((startYear + endYear) / 2);
      const eraLabel = lang.eraLabel(Math.floor(midYear / 10) * 10);
      const city = personalData?.city || formData?.city || '';
      const subcultureName = subculture?.myGroup || '';

      const formatLRC = (totalSeconds: number): string => {
        const mm = String(Math.floor(totalSeconds / 60)).padStart(2, '0');
        const ssFull = totalSeconds % 60;
        const ss = String(Math.floor(ssFull)).padStart(2, '0');
        const cs = String(Math.round((ssFull - Math.floor(ssFull)) * 100)).padStart(2, '0');
        return `[${mm}:${ss}.${cs}]`;
      };

      const hasEvents = events && events.length > 0;

      if (hasEvents) {
        const DURATION_PER_SLIDE = 5.0;
        const OVERLAP = 1.3;
        const EFFECTIVE_DURATION = DURATION_PER_SLIDE - OVERLAP;

        const skeletonLines: string[] = [];
        skeletonLines.push(`[verse]`);
        skeletonLines.push(`${formatLRC(0)} Introduction (Theme: ${eraLabel})`);

        events!.forEach((e, i) => {
          const time = (i + 1) * EFFECTIVE_DURATION;
          if (i > 0 && i % 4 === 0) {
            skeletonLines.push(i % 8 === 0 ? `[verse]` : `[chorus]`);
          }
          skeletonLines.push(`${formatLRC(time)} Event: ${e.title}`);
        });

        const outroTime = (events!.length + 1) * EFFECTIVE_DURATION;
        skeletonLines.push(`[chorus]`);
        skeletonLines.push(`${formatLRC(outroTime)} Outro`);

        const structurePrompt = skeletonLines.join('\n');
        console.log('[DiffRhythm] Event skeleton:\n' + structurePrompt);

        const lrcLangInstruction = lang.langCode === 'en' 
          ? 'Write in English.' 
          : 'Schrijf in het Nederlands.';

        systemPrompt = `You are a lyricist writing music for a video clip. Below is a timeline of events with hard timestamps in LRC format. Your task: Write exactly one short, singable line for each timestamp that matches that specific event.

Rules:
1. Copy the timestamp EXACTLY in [mm:ss.cc] format. Do NOT change the time.
2. Keep the [verse] and [chorus] section markers EXACTLY as given.
3. The text must relate to the event behind the timestamp.
4. Keep it short (max 6-8 words per line), the tempo is high.
5. Rhyme is nice, but matching content with the event is MORE IMPORTANT.
6. ${lrcLangInstruction}
7. Output ONLY the LRC text ([verse]/[chorus] markers + timestamp + line), no other text.

MUSIC STYLE: ${suggestedStyle}${moodTags ? `, ${moodTags}` : ''}${textureTags ? `, ${textureTags}` : ''}`;

        const writeVerb = lang.langCode === 'en' ? 'Write' : 'Schrijf';
        userPrompt = `${writeVerb} for EACH timestamp exactly one short singable line. Keep [verse]/[chorus] markers and timestamps exact:

${structurePrompt}

Format your output as JSON:
{
  "lyrics": "The full LRC text...",
  "style": "${suggestedStyle}",
  "title": "Short title (max 3 words)"
}`;

      } else {
        const SONG_DURATION = 90;
        const LINE_INTERVAL = 3.5;
        const totalLines = Math.floor(SONG_DURATION / LINE_INTERVAL);

        const templateLines: string[] = [];
        for (let i = 0; i < totalLines; i++) {
          const time = i * LINE_INTERVAL;
          if (i === 0) templateLines.push(`[verse]`);
          else if (i === 8) templateLines.push(`[chorus]`);
          else if (i === 12) templateLines.push(`[verse]`);
          else if (i === 20) templateLines.push(`[chorus]`);
          else if (i === 24) templateLines.push(`[verse]`);
          templateLines.push(`${formatLRC(time)} (line ${i + 1})`);
        }

        const templatePrompt = templateLines.join('\n');
        console.log(`[DiffRhythm] V1 quick template (${totalLines} lines):\n` + templatePrompt);

        const eraEventExamples: Record<string, string[]> = lang.langCode === 'en' ? {
          '50': ['Rock around the Clock', 'Elvis on the radio', 'First TV at home', 'Korean War ends'],
          '60': ['The Beatles on TV', 'Moon landing', 'Woodstock', 'Pirate radio', 'Flower Power'],
          '70': ['Disco on Saturday night', 'Oil crisis', 'ABBA wins Eurovision', 'Punk at the pub', 'Star Wars in cinema'],
          '80': ['MTV and music videos', 'Walkman to school', 'Fall of the Wall', 'Pac-Man and Atari', 'Live Aid'],
          '90': ['Rave parties', 'Internet for the first time', 'Tamagotchi', 'Spice Girls', 'Y2K panic', 'MSN Messenger', 'Nirvana on MTV'],
          '00': ['9/11 on television', 'MySpace and MSN', 'iPod and mp3', 'Harry Potter', 'Facebook begins'],
          '10': ['Instagram and selfies', 'Watching vlogs', 'Spotify', 'Pokémon Go', 'Netflix binge-watching', 'Climate protests'],
          '20': ['Corona and lockdowns', 'TikTok', 'Working from home', 'Livestreams', 'AI breaks through'],
        } : {
          '50': ['Rock around the Clock', 'Elvis op de radio', 'Eerste televisie thuis', 'Watersnoodramp'],
          '60': ['De Beatles op TV', 'Maanlanding', 'Provo-beweging', 'Piratenzenders', 'Flower Power'],
          '70': ['Disco op zaterdagavond', 'Oliecrisis en autoloze zondag', 'ABBA wint Songfestival', 'Punk in de kroeg', 'Star Wars in de bios'],
          '80': ['Doe Maar op de radio', 'MTV en videoclips', 'Walkman mee naar school', 'Val van de Muur', 'Pac-Man en Atari', 'Live Aid'],
          '90': ['Gabberfeesten', 'Internet voor het eerst', 'Tamagotchi', 'Spice Girls', 'Euro komt eraan', 'MSN Messenger', 'Nirvana op MTV'],
          '00': ['9/11 op televisie', 'Hyves en MSN', 'iPod en mp3', 'Holland op het EK', 'Harry Potter', 'Facebook begint'],
          '10': ['Instagram en selfies', 'Vlogs kijken', 'Spotify', 'Pokémon Go', 'Netflix bingewatchen', 'Klimaatprotesten'],
          '20': ['Corona en lockdowns', 'TikTok', 'Thuiswerken', 'Livestreams', 'AI breekt door'],
        };
        
        const decadeKey = String(Math.floor(midYear / 10) * 10).slice(-2);
        const relevantEvents = eraEventExamples[decadeKey] || eraEventExamples['90'];
        const eventExamplesStr = relevantEvents.map((e, i) => `  - ${e}`).join('\n');

        const lrcLangInstruction = lang.langCode === 'en'
          ? 'LANGUAGE: English — all text MUST be in English'
          : 'TAAL: Nederlands — alle tekst MOET in het Nederlands zijn';

        systemPrompt = lang.langCode === 'en'
          ? `You are a talented songwriter who writes nostalgic songs in LRC format for DiffRhythm music generation.

You write a complete song of ~90 seconds in LRC format with [verse] and [chorus] sections.

=== CRITICAL: CONTENT MUST MATCH THE ERA ===
The lyrics must CONCRETELY reference recognizable events, trends and memories from the ${eraLabel} (${startYear}-${endYear}).
Use these examples as inspiration (incorporate at least 5 in the lyrics):
${eventExamplesStr}

IMPORTANT LRC FORMAT:
- Each line starts with a timestamp in [mm:ss.cc] format
- Sections are marked with [verse] or [chorus] on a separate line
- Keep lines short (6-10 words), singable and rhythmic
- The song must contain AT LEAST 20 lines spread across 90 seconds
- Timestamps must increase from [00:00.00] to approximately [01:25.00]

THEME: Nostalgia for the ${eraLabel} (${startYear}-${endYear})
${city ? `CITY: ${city}` : ''}
${subcultureName ? `SUBCULTURE: ${subcultureName}` : ''}
${lrcLangInstruction}
MUSIC STYLE: ${suggestedStyle}${moodTags ? `, ${moodTags}` : ''}${textureTags ? `, ${textureTags}` : ''}`
          : `Je bent een getalenteerde Nederlandse songwriter die nostalgische liedjes schrijft in LRC-formaat voor DiffRhythm muziekgeneratie.

Je schrijft een compleet lied van ~90 seconden in LRC-formaat met [verse] en [chorus] secties.

=== KRITISCH: INHOUD MOET AANSLUITEN BIJ HET TIJDPERK ===
De teksten moeten CONCREET verwijzen naar herkenbare gebeurtenissen, trends en herinneringen uit de ${eraLabel} (${startYear}-${endYear}).
Gebruik deze voorbeelden als inspiratie (verwerk er minstens 5 in de songtekst):
${eventExamplesStr}

BELANGRIJK LRC-FORMAAT:
- Elke regel begint met een timestamp in [mm:ss.cc] formaat
- Secties worden gemarkeerd met [verse] of [chorus] op een aparte regel
- Houd regels kort (6-10 woorden), zingbaar en ritmisch
- Het lied moet MINSTENS 20 regels bevatten verspreid over 90 seconden
- Timestamps moeten oplopen van [00:00.00] tot circa [01:25.00]

THEMA: Nostalgie naar de ${eraLabel} (${startYear}-${endYear})
${city ? `STAD: ${city}` : ''}
${subcultureName ? `SUBCULTUUR: ${subcultureName}` : ''}
${lrcLangInstruction}
MUZIEKSTIJL: ${suggestedStyle}${moodTags ? `, ${moodTags}` : ''}${textureTags ? `, ${textureTags}` : ''}`;

        const writeVerb = lang.langCode === 'en' ? 'Write a nostalgic English song' : 'Schrijf een nostalgisch Nederlands lied';
        const inCity = lang.langCode === 'en' ? 'in' : 'in';
        const growingUp = lang.langCode === 'en' ? 'about growing up in the' : 'over opgroeien in de';
        
        userPrompt = `${writeVerb} in LRC format ${growingUp} ${eraLabel}${city ? ` ${inCity} ${city}` : ''}.

The song must:
- Contain at least 20 lines
- Timestamps spread across 90 seconds ([00:00.00] to [01:25.00])
- Contain [verse] and [chorus] section markers
- Be short, singable and emotional
- CONCRETELY reference recognizable events and trends from the ${eraLabel}:
${eventExamplesStr}
${subcultureName ? `- Breathe the atmosphere of the ${subcultureName} subculture` : ''}

Here is the structure with timestamps you must copy EXACTLY:

${templatePrompt}

Replace "(line X)" with your own singable text that MATCHES recognizable events from the ${eraLabel}. Keep timestamps and section markers EXACT.

Format your output as JSON:
{
  "lyrics": "The full LRC text with [verse]/[chorus] markers and timestamps...",
  "style": "${suggestedStyle}",
  "title": "Short title (max 3 words)"
}`;
      }
    }

    // Retry logic for short lyrics
    const MAX_ATTEMPTS = 2;
    let parsedContent: { lyrics: string; style: string; title: string } | null = null;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
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
          temperature: 0.8 + (attempt - 1) * 0.1,
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`AI gateway error: ${response.status}`, errorText);
        
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: "Too many requests. Please try again later." }), {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: "Credits exhausted. Please add credits." }), {
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

      console.log(`AI Response received (attempt ${attempt}), parsing...`);

      try {
        const cleanedContent = content.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        parsedContent = JSON.parse(cleanedContent);
      } catch (parseError) {
        console.error("Failed to parse AI response as JSON:", content);
        parsedContent = {
          lyrics: content,
          style: suggestedStyle,
          title: lang.songTitleFallback(startYear, endYear),
        };
      }

      const lyricsLength = parsedContent!.lyrics?.length || 0;
      if (lyricsLength >= 100) {
        console.log(`Lyrics length OK: ${lyricsLength} chars (attempt ${attempt})`);
        break;
      }

      console.warn(`Lyrics too short (${lyricsLength} chars) on attempt ${attempt}/${MAX_ATTEMPTS}. ${attempt < MAX_ATTEMPTS ? 'Retrying...' : 'Using anyway.'}`);
    }

    // For DiffRhythm: keep style SHORT (just genre). For Suno: add vocal type.
    let finalStyle = parsedContent!.style;
    if (provider !== 'diffrhythm' && vocalType) {
      finalStyle = `${parsedContent!.style}, ${vocalType}`;
    }

    console.log(`Generated song: "${parsedContent!.title}" in style "${finalStyle}"`);
    console.log(`Lyrics length: ${parsedContent!.lyrics?.length || 0} chars`);
    console.log(`Mode used: ${isQuickMode ? 'QUICK (V1)' : 'FULL (V2)'}, Language: ${lang.langName}`);

    return new Response(JSON.stringify({
      success: true,
      data: {
        lyrics: parsedContent!.lyrics,
        style: finalStyle,
        title: parsedContent!.title,
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
      error: error instanceof Error ? error.message : "Error generating lyrics",
    }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
