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
  fr: "Écrivez tout le texte en français."
};

// =============================================================================
// CATEGORIEËN
// =============================================================================
export const EVENT_CATEGORIES = [
  "politics", "sports", "entertainment", "science", "culture", "world", 
  "local", "personal", "music", "technology", "celebrity"
] as const;

// =============================================================================
// HELPER: VISUAL DIRECTOR INSTRUCTIES
// =============================================================================
const VISUAL_DIRECTOR_INSTRUCTIONS = `
ROL: BEELDREDACTEUR (CRUCIAAL)
Jij bepaalt welke zoekterm ('imageSearchQueryEn') wordt gebruikt om een foto te vinden.

GOUDEN REGEL: Wikimedia Commons is Engelstalig.
Vertaal ALTIJD het onderwerp naar het ENGELS voor 'imageSearchQueryEn'.

REGELS PER TYPE:

1. MUZIEK & BEROEMDHEDEN (Category: music, celebrity)
   * Is de naam uniek? Alleen de naam. (Bijv. "David Bowie")
   * Is de naam een gewoon woord of dubbelzinnig? VOEG CONTEXT TOE.
   * FOUT: "Queen", "Prince", "Kiss" (Geeft koninginnen en zoenen)
   * GOED: "Queen band", "Prince singer", "Kiss band"

2. SPEELGOED, GAMES & RAGES
   * Vertaal productnaam naar Engels. Wees specifiek.
   * FOUT: "De Smurfen", "Pac-Man"
   * GOED: "The Smurfs", "Pac-Man arcade", "Rubik's Cube"

3. PRODUCTEN & TECH
   * Gebruik modelnaam of type.
   * FOUT: "Windows 1.0" (Te vaag) -> GOED: "Windows 1.0 screenshot" of "Windows 1.0 software"
   * FOUT: "Eerste mobieltje" -> GOED: "Motorola DynaTAC"

4. FILMS & TV
   * ALTIJD jaartal of "film"/"TV show" toevoegen.
   * GOED: "Titanic film 1997", "Friends TV show"

5. ALGEMEEN
   * Verwijder woorden als "Introductie", "Lancering", "Succes". Houd het PUUR op het onderwerp.
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
Je MOET je output formatteren als NDJSON (Newline Delimited JSON).
Stuur ELKE gebeurtenis als een apart JSON-object op een NIEUWE regel.

FORMAT PER REGEL (BELANGRIJK: Vul ook spotifySearchQuery en movieSearchQuery in indien van toepassing!):
{"type":"event","data":{"id":"evt_1","date":"1980-05-22","year":1980,"month":5,"title":"Titel","description":"...","category":"culture","imageSearchQuery":"Pac-Man spel","imageSearchQueryEn":"Pac-Man arcade","importance":"high","eventScope":"period","spotifySearchQuery":"Artist - Title","movieSearchQuery":"Movie Title trailer"}}

NA ALLE EVENTS:
{"type":"summary","data":"Samenvatting..."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1950,"imageSearchQuery":"Naam portrait"}]}

REGELS:
1. GEEN markdown, ALLEEN JSON regels.
2. Genereer ${eventCount} events.
3. 'imageSearchQueryEn' is je zoekopdracht voor de foto database. Zorg dat deze ENGELS en SPECIFIEK is.
4. 'spotifySearchQuery': Vul in voor muziek events ("Artiest - Titel") of nummer 1 hits.
5. 'movieSearchQuery': Vul in voor films ("Titel trailer jaar").`;
}

// =============================================================================
// SYSTEM PROMPT - STANDAARD
// =============================================================================
export function getSystemPrompt(language: string, maxEvents?: number): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.nl;
  
  return `Je bent een historicus en expert beeldredacteur.

${langInstruction}

${VISUAL_DIRECTOR_INSTRUCTIONS}

Genereer een JSON object met 'events', 'summary' en 'famousBirthdays'.`;
}

// =============================================================================
// PERIOD PROMPTS
// =============================================================================
export const PERIOD_PROMPTS = {
  birthyear: `CONTENT FOCUS - GEBOORTEJAAR:
Focus op de sfeer van dat specifieke jaar:
- DE GROTE HITS (Muziek).
- RAGES & SPEELGOED: Wat lag er in de winkel? (Gebruik Engelse namen voor zoeken!)
- FILM/TV: De blockbusters en series.
- NIEUWS: Grote wereldgebeurtenissen.`,

  childhood: `CONTENT FOCUS - JEUGD (6-10 jaar):
Focus op:
- SCHOOLPLEIN RAGES: Knikkers, flippo's, tamagotchi.
- TV & CARTOONS: Intro-tunes, kinderseries.
- SPEELGOED: Lego, Barbie, Action Man, Nintendo.
- SNOEP: Wat kocht je voor een gulden?`,

  puberty: `CONTENT FOCUS - PUBERTIJD (11-17 jaar):
Focus op:
- MUZIEK & IDENTITEIT: Stromingen, idolen.
- TECH: Eerste mobieltje, MSN, mp3-speler.
- TV & SERIES: Videoclips, populaire soaps.`,

  youngAdult: `CONTENT FOCUS - JONG VOLWASSEN (18-25 jaar):
Focus op:
- UITGAAN & FESTIVALS.
- MAATSCHAPPIJ & POLITIEK.
- TECH REVOLUTIES.`,

  custom: `CONTENT FOCUS - BREDE MIX:
Variatie van hits, nieuws, films, tech en sport.`
};

export function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case 'birthyear': return PERIOD_PROMPTS.birthyear;
    case 'childhood': return PERIOD_PROMPTS.childhood;
    case 'puberty': return PERIOD_PROMPTS.puberty;
    case 'young-adult': return PERIOD_PROMPTS.youngAdult;
    default: return PERIOD_PROMPTS.custom;
  }
}

// ... (Rest van de helper functies zoals getTimelineTool, MONTH_NAMES, etc.)

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
                imageSearchQuery: { type: "string", description: "Original search term" },
                imageSearchQueryEn: { 
                  type: "string", 
                  description: "ENGLISH SEARCH TERM for Wikimedia Commons. Translate product names! Example: 'The Smurfs', 'Transformers toy', 'Rubik's Cube'." 
                },
                importance: { type: "string", enum: ["high", "medium", "low"] },
                eventScope: { type: "string", enum: ["birthdate", "birthmonth", "birthyear", "period"] },
                isCelebrityBirthday: { type: "boolean" },
                isMovie: { type: "boolean" },
                spotifySearchQuery: { type: "string" },
                movieSearchQuery: { type: "string" }
              },
              required: ["id", "date", "year", "title", "description", "category", "importance", "eventScope", "imageSearchQueryEn"]
            }
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
                imageSearchQuery: { type: "string" }
              },
              required: ["name", "profession", "birthYear"]
            }
          }
        },
        required: ["events", "summary"]
      }
    }
  };
}

export const MONTH_NAMES = [
  "januari", "februari", "maart", "april", "mei", "juni",
  "juli", "augustus", "september", "oktober", "november", "december"
];

export const BIRTHDATE_PROMPT_SHORT = (day: number, monthName: string, year: number, maxEvents: number, contentFocus: string) => 
`Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer PRECIES ${maxEvents} events.
HARDE EISEN:
- MUZIEK: Minimaal 2, Maximaal 4 (Nr 1 hits).
- BEROEMDHEDEN: Maximaal 2.
${contentFocus}`;

export const BIRTHDATE_PROMPT_FULL = (day: number, monthName: string, year: number, contentFocus: string) => 
`Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer 50 events.
HARDE EISEN:
- MUZIEK: 5-10 events.
- BEROEMDHEDEN: Max 5.
${contentFocus}`;

export const RANGE_PROMPT = (startYear: number, endYear: number, isShort: boolean, targetEvents: number, contentFocus: string) =>
`Maak een tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.
${contentFocus}`;

export const FAMOUS_BIRTHDAYS_ADDITION = (day: number, monthName: string, startYear: number, endYear: number) =>
`\nZoek personen die op ${day} ${monthName} jarig zijn (geboren voor of tijdens deze periode).`;

export const BIRTHYEAR_IN_RANGE_ADDITION = (year: number) =>
`\nHet geboortejaar ${year} is speciaal.`;

export const PERSONAL_NAME_ADDITION = (fullName: string) =>
`\nTijdlijn voor: ${fullName}.`;

export const GEOGRAPHIC_FOCUS = {
  netherlands: "\nFocus: Nederland.",
  europe: "\nFocus: Europa.",
  world: "\nFocus: Wereld."
};

export const INTERESTS_ADDITION = (interests: string) =>
`\nInteresses: ${interests}.`;

export const CITY_ADDITION = (city: string) =>
`\nWoonplaats: ${city}.`;

export const CHILDREN_ADDITION = (childrenInfo: string[]) =>
`\nKinderen: ${childrenInfo.join(", ")}`;
