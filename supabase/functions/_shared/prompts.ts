/**
 * Centralized AI prompts and instructions for the timeline generator.
 * This file contains all system prompts, period-specific content focus, and language-specific instructions.
 */

export const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

/**
 * Get content focus based on the period type (e.g., childhood focuses on toys/cartoons)
 */
export function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case 'birthyear':
      return `Focus op de exacte geboortedatum en geboorteperiode. Wat gebeurde er op de dag zelf? Welke beroemdheden zijn op dezelfde dag geboren? Wat was het nummer 1 hit? Welke grote gebeurtenissen vonden plaats in dat jaar?`;
    case 'childhood':
      return `Focus op de kindertijd (0-10 jaar). Denk aan: populair speelgoed, kinderprogramma's op TV, tekenfilms, kinderboeken, kinderliedjes, snoep en snacks, schoolherinneringen, spelletjes op straat, verjaardagsfeestjes, vakantie-herinneringen.`;
    case 'puberty':
      return `Focus op de puberteit/tienerperiode (11-17 jaar). Denk aan: popmuziek en idolen, mode en trends, eerste liefdes, schoolfeesten, MTV en muziekvideo's, eerste computers en games, tienerfilms, jeugdcultuur, rebellion en identiteit.`;
    case 'young-adult':
      return `Focus op jong volwassenheid (18-25 jaar). Denk aan: studie, uitgaan, eerste baan, eerste auto, relaties, festivals, reizen, onafhankelijkheid, belangrijke levenskeuzes.`;
    default:
      return `Geef een gevarieerde mix van politiek, cultuur, sport, entertainment, muziek, technologie en lokale gebeurtenissen.`;
  }
}

/**
 * NDJSON streaming system prompt - instructs AI to output events line by line
 */
export function getNDJSONSystemPrompt(language: string, maxEvents?: number): string {
  const eventCount = maxEvents || 50;
  
  return `Je bent een enthousiaste historicus die een persoonlijke tijdlijn maakt.

OUTPUT FORMAAT:
Je MOET events sturen als NDJSON (één JSON object per regel). Elke regel is een compleet JSON object.

FORMAAT PER REGEL:
{"type":"event","data":{"id":"evt_1","date":"1985-03-15","year":1985,"month":3,"day":15,"title":"Titel hier","description":"Beschrijving hier","category":"music","importance":"high","eventScope":"period","imageSearchQuery":"zoekterm voor afbeelding","imageSearchQueryEn":"English search query for image","spotifySearchQuery":"Artist - Title","movieSearchQuery":"Film titel trailer jaar","isMovie":false}}

NA ALLE EVENTS, stuur:
{"type":"summary","data":"Een korte samenvatting van de periode."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1970,"imageSearchQuery":"naam portret"}]}

REGELS:
1. Stuur PRECIES ${eventCount} events.
2. Eén JSON object per regel, geen arrays, geen extra tekst.
3. Elke regel MOET valid JSON zijn.
4. Categories: politics, sports, entertainment, science, culture, world, local, personal, music, technology, celebrity
5. MUZIEK events (category=music) MOETEN spotifySearchQuery hebben in formaat "Artiest - Titel".
6. FILM events MOETEN movieSearchQuery EN isMovie=true hebben.
7. Alle tekst in het ${language === 'nl' ? 'Nederlands' : language}.
8. imageSearchQuery in de taal van de gebruiker, imageSearchQueryEn altijd in het Engels.
9. Chronologische volgorde.
10. Variatie in categorieën.`;
}

/**
 * Standard system prompt for non-streaming responses
 */
export function getSystemPrompt(language: string, maxEvents?: number): string {
  const eventCount = maxEvents || 50;
  
  return `Je bent een enthousiaste historicus die een persoonlijke tijdlijn maakt. 
Je genereert ${eventCount} historische gebeurtenissen met de volgende structuur.

BELANGRIJKE REGELS:
1. Alle tekst in het ${language === 'nl' ? 'Nederlands' : language}.
2. Varieer tussen categorieën: politics, sports, entertainment, science, culture, world, local, personal, music, technology, celebrity.
3. imageSearchQuery: zoekterm in de taal van de gebruiker voor het vinden van afbeeldingen.
4. imageSearchQueryEn: Engelse vertaling voor Wikimedia Commons zoeken.
5. Voor MUZIEK events (category=music): voeg spotifySearchQuery toe in formaat "Artiest - Titel".
6. Voor FILM events: voeg movieSearchQuery toe (bijv. "Titanic trailer 1997") EN zet isMovie=true.
7. Chronologische volgorde.
8. Mix van belangrijke wereldgebeurtenissen en lokale/persoonlijke relevante events.`;
}

// ============== PROMPT TEMPLATES ==============

export const BIRTHDATE_PROMPT_SHORT = (day: number, month: string, year: number, maxEvents: number, contentFocus: string): string => `
Maak een tijdlijn van ${maxEvents} belangrijke gebeurtenissen rond de geboortedatum ${day} ${month} ${year}.

INHOUDELIJKE FOCUS:
${contentFocus}

VERDELING:
- 3-4 events van de exacte geboortedag (eventScope: "birthdate")
- 3-4 events van de geboortemaand (eventScope: "birthmonth") 
- 3-4 events van het geboortejaar (eventScope: "birthyear")
- Rest: periode erna (eventScope: "period")

Voeg toe:
- Nummer 1 hits (met spotifySearchQuery!)
- Beroemdheden geboren op dezelfde dag (isCelebrityBirthday: true)
- Grote nieuwsgebeurtenissen
- Cultuur, sport, technologie
`;

export const BIRTHDATE_PROMPT_FULL = (day: number, month: string, year: number, contentFocus: string): string => `
Maak een uitgebreide tijdlijn rond de geboortedatum ${day} ${month} ${year}.

INHOUDELIJKE FOCUS:
${contentFocus}

VERDELING:
- 5-8 events van de exacte geboortedag (eventScope: "birthdate")
- 8-12 events van de geboortemaand (eventScope: "birthmonth")
- 15-20 events van het geboortejaar (eventScope: "birthyear")  
- Rest: jaren erna (eventScope: "period")

Inclusief:
- Alle nummer 1 hits van het jaar (met spotifySearchQuery in formaat "Artiest - Titel"!)
- Beroemdheden geboren op dezelfde dag (isCelebrityBirthday: true)
- Belangrijke films (met movieSearchQuery EN isMovie: true!)
- Grote nieuwsgebeurtenissen
- Technologische doorbraken
- Sport hoogtepunten
- Mode en cultuur trends
`;

export const RANGE_PROMPT = (startYear: number, endYear: number, isShort: boolean, targetEvents: number, contentFocus: string): string => `
Maak een tijdlijn van ${targetEvents} belangrijke gebeurtenissen van ${startYear} tot ${endYear}.

INHOUDELIJKE FOCUS:
${contentFocus}

${isShort ? 'Focus op de allerbelangrijkste momenten.' : 'Wees uitgebreid en gedetailleerd.'}

Alle events krijgen eventScope: "period".

Inclusief:
- Grote hits per jaar (met spotifySearchQuery in formaat "Artiest - Titel"!)
- Belangrijke films (met movieSearchQuery EN isMovie: true!)
- Politieke gebeurtenissen
- Sportmomenten
- Technologie en wetenschap
- Cultuur en entertainment
- Nederlandse en internationale events
`;

export const FAMOUS_BIRTHDAYS_ADDITION = (day: number, month: string, startYear: number, endYear: number): string => `

BELANGRIJK: Voeg ook beroemdheden toe die op ${day} ${month} geboren zijn (tussen ${startYear} en ${endYear}).
Zet voor deze events: isCelebrityBirthday: true, category: "celebrity", eventScope: "birthdate".
`;

export const BIRTHYEAR_IN_RANGE_ADDITION = (year: number): string => `

Het geboortejaar ${year} valt in de range. Voeg extra events toe van dat specifieke jaar met eventScope: "birthyear".
`;

export const PERSONAL_NAME_ADDITION = (fullName: string): string => `

De persoon heet ${fullName}. Personaliseer waar mogelijk (bijv. "In het jaar dat ${fullName} geboren werd...").
`;

export const GEOGRAPHIC_FOCUS: Record<string, string> = {
  netherlands: `

GEOGRAFISCHE FOCUS: Nederland
- Prioriteer Nederlandse gebeurtenissen, maar inclusief belangrijke internationale events.
- Nederlandse politiek, Oranjehuis, Eredivisie, Nederlandse artiesten en films.
- Nederlandse TV-programma's en cultuur.
`,
  europe: `

GEOGRAFISCHE FOCUS: Europa  
- Mix van Nederlandse en Europese gebeurtenissen.
- Eurovisie Songfestival, Europese politiek, Europese sport.
- Inclusief belangrijke wereldgebeurtenissen.
`,
  world: `

GEOGRAFISCHE FOCUS: Wereld
- Internationale focus met wereldwijde gebeurtenissen.
- Amerikaanse, Europese en mondiale events.
- Nederlandse context waar relevant.
`
};

export const INTERESTS_ADDITION = (interests: string): string => `

INTERESSES: ${interests}
Voeg extra events toe gerelateerd aan deze interesses.
`;

export const CITY_ADDITION = (city: string): string => `

WOONPLAATS: ${city}
Voeg indien mogelijk lokale gebeurtenissen toe uit ${city} of de regio.
`;

export const CHILDREN_ADDITION = (childrenInfo: string[]): string => `

KINDEREN: ${childrenInfo.join(', ')}
Voeg de geboortes van de kinderen toe als persoonlijke events (category: "personal", eventScope: "period").
`;
