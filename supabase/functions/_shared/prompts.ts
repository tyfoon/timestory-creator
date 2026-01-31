/**
 * =============================================================================
 * AI PROMPTS CONFIGURATIE
 * =============================================================================
 */

// =============================================================================
// TAAL INSTRUCTIES
// =============================================================================
export const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  nl: "Schrijf alle tekst in het Nederlands.",
  en: "Write all text in English.",
  de: "Schreibe alle Texte auf Deutsch.",
  fr: "Écrivez tout le texte en français.",
};

// =============================================================================
// CATEGORIEËN
// =============================================================================
export const EVENT_CATEGORIES = [
  "politics",
  "sports",
  "entertainment",
  "science",
  "culture",
  "world",
  "local",
  "personal",
  "music",
  "technology",
  "celebrity",
] as const;

// ... (Houd imports en LANGUAGE_INSTRUCTIONS hetzelfde)

// =============================================================================
// HELPER: VISUAL DIRECTOR INSTRUCTIES
// =============================================================================
const VISUAL_DIRECTOR_INSTRUCTIONS = `
ROL: BEELDREDACTEUR (CRUCIAAL)
Jij bepaalt NIET ALLEEN de zoekterm, maar ook het TYPE afbeelding ('visualSubjectType').
Dit helpt de zoekmachine om de juiste database te kiezen (Film database, Product database, etc).

⚠️ ABSOLUUT VERBODEN IN ZOEKOPDRACHTEN ⚠️
NOOIT decade-referenties gebruiken! Zoekmachines begrijpen deze niet:
- FOUT: "1980s", "1990s", "2000s", "1970s"
- FOUT: "80s", "90s", "70s", "00s" 
- FOUT: "jaren 80", "jaren 90", "jaren 70"
- FOUT: "eighties", "nineties", "seventies"
- GOED: Zoek op SPECIFIEKE namen, titels, of producten

KIES HET JUISTE 'visualSubjectType':
1. 'person': Voor artiesten, politici, sporters, beroemdheden. (Zoekt in portret-database)
2. 'movie': Voor films en TV-series. (Zoekt filmposters)
3. 'product': Voor gadgets, speelgoed, auto's, consoles, lifestyle items. (Zoekt productfoto's)
4. 'logo': Voor software, websites, bedrijven, games. (Zoekt logo's/icons)
5. 'event': Voor oorlogen, rampen, kroningen, protesten. (Zoekt nieuwsfoto's)
6. 'location': Voor steden, gebouwen.
7. 'artwork': Voor schilderijen, boekomslagen, albums.
8. 'culture': Voor rages, muziekstromingen, dansstijlen, mode.

⚠️ KRITISCH - TWEE APARTE ZOEKOPDRACHTEN IN VERSCHILLENDE TALEN! ⚠️

'imageSearchQuery' = ALTIJD NEDERLANDS (Nederlandse woorden!)
'imageSearchQueryEn' = ALTIJD ENGELS (Engelse woorden!)

VERPLICHTE VERTALINGEN - NL MOET ECHT NEDERLANDS ZIJN:
- "Chernobyl" → NL: "Tsjernobyl", EN: "Chernobyl"
- "Berlin Wall" → NL: "Berlijnse Muur", EN: "Berlin Wall"  
- "Cold War" → NL: "Koude Oorlog", EN: "Cold War"
- "World War" → NL: "Wereldoorlog", EN: "World War"
- "power plant" → NL: "kerncentrale", EN: "power plant"
- "nuclear disaster" → NL: "kernramp", EN: "nuclear disaster"
- "space shuttle" → NL: "spaceshuttle", EN: "space shuttle"
- "earthquake" → NL: "aardbeving", EN: "earthquake"
- "flood" → NL: "overstroming", EN: "flood"
- "election" → NL: "verkiezing", EN: "election"
- "championship" → NL: "kampioenschap", EN: "championship"

VOORBEELDEN (let op de ECHTE Nederlandse woorden):
- Event "Kernramp Tsjernobyl": 
  imageSearchQuery="Tsjernobyl kerncentrale" ✓
  imageSearchQueryEn="Chernobyl power plant" ✓
  FOUT: imageSearchQuery="Chernobyl power plant" ✗ (dit is Engels!)

- Event "Val van de Berlijnse Muur":
  imageSearchQuery="Val Berlijnse Muur" ✓
  imageSearchQueryEn="Fall of the Berlin Wall" ✓

- Event "Challenger-ramp":
  imageSearchQuery="Challenger spaceshuttle explosie" ✓
  imageSearchQueryEn="Challenger space shuttle explosion" ✓

UITZONDERING: Merknamen en eigennamen blijven hetzelfde in beide talen:
- "Sony Walkman", "Pac-Man", "iPhone", "Madonna", "Michael Jackson"


⚠️ REGELS VOOR BEIDE TALEN (NL én EN) - GEEN JAARTALLEN/DECENNIA! ⚠️

REGELS VOOR 'imageSearchQuery' (NEDERLANDS):
- NOOIT jaartallen: "1980", "1990", "2000"
- NOOIT decennia: "jaren 80", "jaren 90", "jaren 70", "80s", "90s"
- NOOIT extra context: fabrikanten, merknamen die niet in de titel staan
- type 'person': ALLEEN de naam. "David Bowie" (NIET "David Bowie zanger")
- type 'movie': ALLEEN de titel. "The A-Team" (NIET "The A-Team serie")
- type 'product': ALLEEN productnaam. "Star Wars actiefiguren" (NIET "Star Wars actiefiguren Kenner")
- UITZONDERING: Voor de originele Sony Walkman uit 1979: "Sony Walkman TPS-L2" (het specifieke model)
- type 'logo': ALLEEN de naam. "Pac-Man" (NIET "Pac-Man logo", NIET "Pac-Man Namco")
- type 'artwork': Artiest + titel. "Thriller Michael Jackson" (NIET "Thriller album")
- type 'culture': SPECIFIEK object/stijl. "Breakdance", "Disco bal"

REGELS VOOR 'imageSearchQueryEn' (ENGELS):
- NOOIT jaartallen: "1980", "1990", "2000"  
- NOOIT decennia: "80s", "90s", "1980s", "eighties", "nineties"
- NOOIT extra context: fabrikanten, merknamen die niet in de titel staan
- type 'person': ALLEEN de naam. "David Bowie" (NIET "David Bowie singer")
- type 'movie': ALLEEN de titel. "The A-Team" (NIET "The A-Team series")
- type 'product': ALLEEN productnaam. "Star Wars action figures" (NIET "Star Wars action figures Kenner")
- UITZONDERING: Voor de originele Sony Walkman uit 1979: "Sony Walkman TPS-L2" (het specifieke model)
- type 'logo': ALLEEN de naam. "Pac-Man" (NIET "Pac-Man logo", NIET "Pac-Man Namco")
- type 'artwork': Artiest + titel. "Thriller Michael Jackson" (NIET "Thriller album")
- type 'culture': SPECIFIEK object/stijl. "Breakdance", "Disco ball"

SPORT EVENTS (category: sports):
- ALTIJD de SPORT vermelden!
- NOOIT jaartallen in de zoekopdracht!
- Voorbeelden:
  - imageSearchQuery="Italië WK voetbal", imageSearchQueryEn="Italy FIFA World Cup football"
  - imageSearchQuery="Wimbledon tennis finale", imageSearchQueryEn="Wimbledon tennis final"

MUZIEK EVENTS (category: music):
- Gebruik 'artwork' type voor albums, 'person' voor artiesten
- ALLEEN "Artiest Titel" voor albums - NIETS ANDERS TOEVOEGEN!
- GEEN extra woorden: "fashion", "style", "look", "singer", "band"
- GEEN decennia: "80s", "jaren 80"
- GEEN jaartallen: "1984", "1982"
- GOED NL: "Like a Virgin Madonna", "Thriller Michael Jackson", "Purple Rain Prince"
- GOED EN: "Like a Virgin Madonna", "Thriller Michael Jackson", "Purple Rain Prince"
- FOUT: "Madonna Like a Virgin fashion", "Madonna 80s fashion", "Thriller 1982 album"
- FOUT: "Prince Purple Rain style", "Michael Jackson singer 1984"
`;

// =============================================================================
// SYSTEM PROMPT - NDJSON STREAMING
// =============================================================================
export function getNDJSONSystemPrompt(language: string, maxEvents?: number): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.nl;
  const isShort = maxEvents && maxEvents <= 20;
  const eventCount = isShort ? maxEvents : 50;

  return `Je bent een historicus en expert beeldredacteur.

${langInstruction}

${VISUAL_DIRECTOR_INSTRUCTIONS}

KRITISCH - OUTPUT FORMAAT (NDJSON):
Stuur ELKE gebeurtenis als een apart JSON-object op een NIEUWE regel.

FORMAT PER REGEL (Let op 'visualSubjectType'!):
{"type":"event","data":{"id":"evt_1","date":"1980-05-22","year":1980,"title":"Pac-Man","description":"...","category":"entertainment","visualSubjectType":"logo","imageSearchQuery":"Pac-Man","imageSearchQueryEn":"Pac-Man","importance":"high","eventScope":"period"}}
{"type":"event","data":{"id":"evt_2","date":"1982","year":1982,"title":"Thriller","description":"...","category":"music","visualSubjectType":"artwork","imageSearchQuery":"Thriller Michael Jackson","imageSearchQueryEn":"Thriller Michael Jackson","importance":"high","eventScope":"period","spotifySearchQuery":"Michael Jackson - Thriller"}}

NA ALLE EVENTS:
{"type":"summary","data":"Samenvatting..."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1950,"imageSearchQuery":"Naam"}]}

REGELS:
1. GEEN markdown.
2. Genereer ${eventCount} events.
3. Vul 'visualSubjectType' ALTIJD in.
4. Vul 'spotifySearchQuery' / 'movieSearchQuery' in waar relevant.`;
}

// ... (Houd getSystemPrompt en PERIOD_PROMPTS hetzelfde, maar update getTimelineTool hieronder:)

export function getTimelineTool() {
  return {
    type: "function",
    function: {
      name: "create_timeline",
      description: "Creates a timeline with historical events",
      parameters: {
        type: "object",
        properties: {
          events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                date: { type: "string" },
                year: { type: "number" },
                month: { type: "number" },
                day: { type: "number" },
                title: { type: "string" },
                description: { type: "string" },
                category: { type: "string", enum: EVENT_CATEGORIES },
                visualSubjectType: {
                  type: "string",
                  enum: ["person", "movie", "product", "logo", "event", "location", "artwork", "culture"],
                  description:
                    "CRITICAL: The visual category of the subject. Used to select the correct image database.",
                },
                imageSearchQuery: { type: "string" },
                imageSearchQueryEn: {
                  type: "string",
                  description: "Specific English search term matching the visualSubjectType rules.",
                },
                importance: { type: "string", enum: ["high", "medium", "low"] },
                eventScope: { type: "string", enum: ["birthdate", "birthmonth", "birthyear", "period"] },
                isCelebrityBirthday: { type: "boolean" },
                isMovie: { type: "boolean" },
                spotifySearchQuery: { type: "string" },
                movieSearchQuery: { type: "string" },
              },
              required: [
                "id",
                "date",
                "year",
                "title",
                "description",
                "category",
                "visualSubjectType",
                "imageSearchQueryEn",
              ],
            },
          },
          summary: { type: "string" },
          famousBirthdays: {
            type: "array",
            items: {
              type: "object",
              properties: {
                name: { type: "string" },
                profession: { type: "string" },
                birthYear: { type: "number" },
                imageSearchQuery: { type: "string" },
              },
              required: ["name", "profession", "birthYear"],
            },
          },
        },
        required: ["events", "summary"],
      },
    },
  };
}

// =============================================================================
// SYSTEM PROMPT - NON-STREAMING (Tool-based)
// =============================================================================
export function getSystemPrompt(language: string, maxEvents?: number): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.nl;
  const eventCount = maxEvents || 50;

  return `Je bent een historicus en expert beeldredacteur.

${langInstruction}

${VISUAL_DIRECTOR_INSTRUCTIONS}

Genereer ${eventCount} historische events met de create_timeline tool.

REGELS:
1. Vul 'visualSubjectType' ALTIJD in.
2. Vul 'spotifySearchQuery' in voor muziek events (Artiest - Titel).
3. Vul 'movieSearchQuery' in voor film events (Titel trailer jaar).`;
}

// =============================================================================
// CONTENT FOCUS PER PERIODE TYPE
// =============================================================================
export function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case "birthyear":
      return `FOCUS: Events uit het exacte geboortejaar. Wereldgebeurtenissen, politiek, muziek, films, cultuur van dat jaar.`;
    case "childhood":
      return `FOCUS: Kindertijd (0-12 jaar). Speelgoed, tekenfilms, kinderprogramma's, games, snoep, lagere school, kindercultuur.`;
    case "puberty":
      return `FOCUS: Puberteit (12-18 jaar). Muziek, films, TV, mode, games, eerste telefoons, sociale media, middelbare school, jeugdcultuur.`;
    case "young-adult":
      return `FOCUS: Jongvolwassenheid (18-25 jaar). Studententijd, eerste baan, festivals, politiek ontwaken, technologie.`;
    default:
      return `FOCUS: Algemene mix van belangrijke wereldgebeurtenissen, cultuur, sport, wetenschap en entertainment.`;
  }
}

// =============================================================================
// CONSTANTEN EN TEMPLATES
// =============================================================================
export const MONTH_NAMES = [
  "januari",
  "februari",
  "maart",
  "april",
  "mei",
  "juni",
  "juli",
  "augustus",
  "september",
  "oktober",
  "november",
  "december",
];

export const BIRTHDATE_PROMPT_SHORT = (
  day: number,
  monthName: string,
  year: number,
  maxEvents: number,
  contentFocus: string,
) =>
  `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer PRECIES ${maxEvents} events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: Minimaal 2, Maximaal 4 (Nr 1 hits).
- BEROEMDHEDEN: Maximaal 2.
${contentFocus}`;

export const BIRTHDATE_PROMPT_FULL = (day: number, monthName: string, year: number, contentFocus: string) =>
  `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer 50 events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: 5-10 events.
- BEROEMDHEDEN: Max 5.
${contentFocus}`;

export const RANGE_PROMPT = (
  startYear: number,
  endYear: number,
  isShort: boolean,
  targetEvents: number,
  contentFocus: string,
) =>
  `Maak een tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.
${contentFocus}`;

export const FAMOUS_BIRTHDAYS_ADDITION = (day: number, monthName: string, startYear: number, endYear: number) =>
  `\nZoek personen die op ${day} ${monthName} jarig zijn.`;

export const BIRTHYEAR_IN_RANGE_ADDITION = (year: number) => `\nHet geboortejaar ${year} is speciaal.`;

export const PERSONAL_NAME_ADDITION = (fullName: string) => `\nTijdlijn voor: ${fullName}.`;

export const GEOGRAPHIC_FOCUS: Record<string, string> = {
  netherlands: "\nFocus: Nederland.",
  europe: "\nFocus: Europa.",
  world: "\nFocus: Wereld.",
};

export const INTERESTS_ADDITION = (interests: string) => `\nInteresses: ${interests}.`;

export const CITY_ADDITION = (city: string) => `\nWoonplaats: ${city}.`;

export const CHILDREN_ADDITION = (childrenInfo: string[]) => `\nKinderen: ${childrenInfo.join(", ")}`;
