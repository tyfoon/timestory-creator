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
// HELPER: VISUAL DIRECTOR INSTRUCTIES (NIEUW!)
// =============================================================================
const VISUAL_DIRECTOR_INSTRUCTIONS = `
ROL: BEELDREDACTEUR (CRUCIAAL)
Jij bepaalt welke zoekterm wordt gebruikt om een foto te vinden.
Jouw doel is om FOUTE matches te voorkomen door ULTRA-SPECIFIEK te zijn.

REGELS VOOR 'imageSearchQueryEn' (Het belangrijkste veld):
1.  GEEN ZINNEN, GEEN WERKWOORDEN. Alleen het ONDERWERP (Zelfstandig naamwoord).
2.  Bepaal het TYPE onderwerp en volg de strategie:

    -> TYPE: PRODUCT / GADGET / AUTO (Category: technology, culture)
       * FOUT: "Introduction of the Walkman" (Te vaag, geeft vogels of mensen)
       * GOED: "Sony Walkman TPS-L2" (Specifiek model!)
       * FOUT: "Swatch watches trend"
       * GOED: "Swatch watch 1983"
       * FOUT: "Commodore 64 release"
       * GOED: "Commodore 64 computer" (Voeg woord 'computer', 'car', 'console' toe)

    -> TYPE: PERSOON / ARTIEST (Category: music, celebrity, sports, politics)
       * FOUT: "Moord op John Lennon" (Geeft gebouwen/plaats delict)
       * GOED: "John Lennon portrait"
       * FOUT: "Winnaar Tour de France Joop Zoetemelk"
       * GOED: "Joop Zoetemelk 1980"

    -> TYPE: GEBEURTENIS (Category: world, politics)
       * FOUT: "Val van de muur"
       * GOED: "Berlin Wall 1989"
       * FOUT: "Watersnoodramp in Zeeland"
       * GOED: "North Sea flood 1953"

3.  FILMS & TV:
    * ALTIJD jaartal toevoegen: "Titanic film 1997", "Friends TV show".

4.  SAMENVATTING:
    * Vraag jezelf: "Als ik dit in Google Afbeeldingen typ, krijg ik dan direct het JUISTE object?"
    * Maak de zoekterm 'schoon'. Verwijder woorden als "Launch", "Premiere", "Birthday", "Dood", "Winnaar".
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

FORMAT PER REGEL:
{"type":"event","data":{"id":"evt_1","date":"1973-03-28","year":1973,"month":3,"day":28,"title":"Titel","description":"Tekst","category":"technology","imageSearchQuery":"Nederlandse term","imageSearchQueryEn":"Sony Walkman TPS-L2","importance":"high","eventScope":"period"}}

NA ALLE EVENTS:
{"type":"summary","data":"Samenvatting..."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1950,"imageSearchQuery":"Naam portrait"}]}

REGELS:
1. GEEN markdown, ALLEEN JSON regels.
2. Genereer ${eventCount} events.
3. imageSearchQueryEn MOET de 'Visual Director' regels volgen (PUUR ONDERWERP).`;
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
// PERIOD PROMPTS (Ongewijzigd, maar contextueel relevant)
// =============================================================================
// ... (Houd hier de inhoud van je vorige prompts.ts voor PERIOD_PROMPTS, 
//      USER PROMPT TEMPLATES, etc. intact. Alleen de System Prompts hierboven zijn cruciaal aangepast.)

export const PERIOD_PROMPTS = {
  birthyear: `CONTENT FOCUS - GEBOORTEJAAR:
Focus op de sfeer van dat specifieke jaar:
- DE GROTE HITS: Welke nummers domineerden de radio?
- SAMENLEVING: Wat hield het nieuws in de greep?
- RAGES: Wat was er dat jaar ineens overal te zien? (Gebruik specifieke productnamen voor foto's!)
- FILM/TV: De blockbusters en series.
- TECHNOLOGIE: Welke nieuwe gadgets kwamen er uit?`,

  childhood: `CONTENT FOCUS - JEUGD (6-10 jaar):
Focus op:
- SCHOOLPLEIN RAGES: Knikkers, flippo's, specifieke spelletjes.
- TV & CARTOONS: Intro-tunes, Zappelin/Fox Kids programma's.
- SPEELGOED: Wat stond er op het verlanglijstje?
- SNOEP & ETEN: Specifieke ijsjes/snoep.`,

  puberty: `CONTENT FOCUS - PUBERTIJD (11-17 jaar):
Focus op:
- MUZIEK & IDENTITEIT: Stromingen, bands, concerten.
- TECH & SOCIAAL: Eerste mobieltje (Nokia 3310, iPhone), MSN, Hyves.
- TV & SERIES: TMF, MTV, Netflix hits.
- SCHOOLLEVEN: Schoolfeesten, trends.`,

  youngAdult: `CONTENT FOCUS - JONG VOLWASSEN (18-25 jaar):
Focus op:
- FESTIVALS & NACHTLEVEN.
- MAATSCHAPPELIJKE EVENTS (9/11, Crisis).
- TECH REVOLUTIES (Facebook, Spotify).`,

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

// ... (Kopieer hier de rest van je bestaande prompts.ts: BIRTHDATE_PROMPT_SHORT, etc. 
//      Zorg dat je 'getTimelineTool' hieronder wel vervangt met de nieuwe beschrijvingen!)

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
                imageSearchQuery: { type: "string", description: "Original search term in user language" },
                imageSearchQueryEn: { 
                  type: "string", 
                  description: "VISUAL SUBJECT ONLY. No verbs, no 'introduction of'. Just the Object Name, Person Name, or Specific Event Name. Example: 'Sony Walkman', 'John Lennon', 'Berlin Wall'." 
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

// ... (Rest van de helper functies zoals buildPrompt, MONTH_NAMES etc. ongewijzigd laten)
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
