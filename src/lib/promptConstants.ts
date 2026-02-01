/**
 * =============================================================================
 * PROMPT CONSTANTS - FRONTEND MIRROR
 * =============================================================================
 * 
 * ⚠️ SYNCHRONISATIE WAARSCHUWING ⚠️
 * Deze file is een MIRROR van: supabase/functions/_shared/prompts.ts
 * 
 * Bij wijzigingen in de backend prompts MOET deze file ook worden aangepast!
 * De PromptViewerDialog gebruikt deze constants om de prompts te tonen.
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
// MAANDNAMEN
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

// =============================================================================
// NOSTALGIE ENGINE
// =============================================================================
export const NOSTALGIA_INSTRUCTIONS = `
RICHTLIJNEN VOOR SFEER & STIJL:
1. **Zintuiglijke Details:** Beschrijf niet alleen feiten, maar geuren, geluiden en gevoelens. (Bv. de geur van brommerbenzine, het ratelende geluid van een videoband terugspoelen, de spanning van teletekst checken).
2. **Analoge Vertraging:** Benadruk dingen die nu weg zijn: wachten op de bus zonder mobiel, foto's laten ontwikkelen, inbellen met een modem.
3. **Persoonlijke Toon:** Gebruik een mijmerende, verhalende stijl. Bekijk alles door de bril van de leeftijd die de gebruiker toen had.
`;

// =============================================================================
// VISUAL DIRECTOR INSTRUCTIES
// =============================================================================
export const VISUAL_DIRECTOR_INSTRUCTIONS = `
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
2. 'movie': ALLEEN voor FILMS (bioscoopfilms). Zet ook 'isMovie: true'. (Zoekt filmposters)
3. 'tv': ALLEEN voor TV-SERIES/SHOWS (Dallas, Swiebertje, Beverly Hills 90210, etc). Zet ook 'isTV: true'. (Zoekt TV-posters)
4. 'product': Voor gadgets, speelgoed, auto's, consoles, lifestyle items. (Zoekt productfoto's)
5. 'logo': Voor software, websites, bedrijven, games. (Zoekt logo's/icons)
6. 'event': Voor oorlogen, rampen, kroningen, protesten. (Zoekt nieuwsfoto's)
7. 'location': Voor steden, gebouwen.
8. 'artwork': Voor schilderijen, boekomslagen, albums.
9. 'culture': Voor rages, muziekstromingen, dansstijlen, mode.

⚠️ CRUCIAAL ONDERSCHEID FILM vs TV-SERIE ⚠️
Dit is de MEEST VOORKOMENDE FOUT! Let goed op:

BIOSCOOPFILM (visualSubjectType: "movie", isMovie: true):
- E.T., Titanic, Star Wars, The Matrix, Jurassic Park, Jaws, Back to the Future
- Kenmerk: Draait in bioscoop, is één afgesloten verhaal

TV-SERIE (visualSubjectType: "tv", isTV: true):
- Beverly Hills 90210, Dallas, Baywatch, Friends, The A-Team, Swiebertje, Knight Rider
- Kenmerk: Wekelijkse afleveringen op televisie, meerdere seizoenen

VEELGEMAAKTE FOUTEN - DIT ZIJN TV-SERIES, GEEN FILMS:
- Baywatch → TV-SERIE (isTV: true) ✓
- Beverly Hills 90210 → TV-SERIE (isTV: true) ✓  
- Dallas → TV-SERIE (isTV: true) ✓
- The A-Team → TV-SERIE (isTV: true) ✓
- Knight Rider → TV-SERIE (isTV: true) ✓
- Friends → TV-SERIE (isTV: true) ✓
- Seinfeld → TV-SERIE (isTV: true) ✓
- Miami Vice → TV-SERIE (isTV: true) ✓
- Dynasty → TV-SERIE (isTV: true) ✓
- Melrose Place → TV-SERIE (isTV: true) ✓

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

WEER EVENTS (sneeuw, hitte, storm, etc.):
⚠️ KRITISCH: Zoek ALTIJD op het weer-fenomeen, NOOIT op de specifieke locatie!
Wikimedia heeft geen foto's van "Sneeuwpret in Hilversum" of "Hittegolf Sittard".
Ze HEBBEN wel generieke foto's van "Sneeuwpret", "Hittegolf", "Watersnood", etc.

VERPLICHTE AANPAK:
- imageSearchQuery = ALLEEN het weer-fenomeen (sneeuwpret, hittegolf, storm, etc.)
- imageSearchQueryEn = ALLEEN de Engelse vertaling (snowfall, heatwave, storm, etc.)
- visualSubjectType = "event" (zoekt in nieuwsfoto's)

VOORBEELDEN:
- Titel "Sneeuwpret op de Anna's Hoeve":
  imageSearchQuery="Sneeuwpret" ✓ (NIET "Anna's Hoeve", NIET "Sneeuwpret Hilversum")
  imageSearchQueryEn="Children playing in snow" ✓
  
- Titel "Hittegolf in Sittard":
  imageSearchQuery="Hittegolf" ✓ (NIET "Sittard", NIET "Hittegolf Limburg")
  imageSearchQueryEn="Heatwave" ✓

- Titel "Koudste winter ooit gemeten":
  imageSearchQuery="Strenge winter" ✓ (NIET jaartal, NIET locatie)
  imageSearchQueryEn="Severe winter frost" ✓

- Titel "Watersnood in Limburg":
  imageSearchQuery="Watersnood overstroming" ✓ (NIET "Limburg")
  imageSearchQueryEn="Flood disaster" ✓

WEER-TERMEN VERTALING:
- sneeuwpret → children playing in snow
- hittegolf → heatwave
- koude/vorst → frost/cold spell  
- watersnood → flood
- storm/orkaan → storm/hurricane
- droogte → drought

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
// NDJSON FORMAT INSTRUCTIONS (for viewer display)
// =============================================================================
export function getNDJSONFormatInstructions(eventCount: number): string {
  return `KRITISCH - OUTPUT FORMAAT (NDJSON):
Stuur ELKE gebeurtenis als een apart JSON-object op een NIEUWE regel.

FORMAT PER REGEL (Let op 'visualSubjectType' en isTV/isMovie vlaggen!):
{"type":"event","data":{"id":"evt_1","date":"1980-05-22","year":1980,"title":"Pac-Man","description":"...","category":"entertainment","visualSubjectType":"logo","imageSearchQuery":"Pac-Man","imageSearchQueryEn":"Pac-Man",...}}
{"type":"event","data":{"id":"evt_2","date":"1982","year":1982,"title":"Thriller","description":"...","category":"music","visualSubjectType":"artwork","imageSearchQuery":"Thriller Michael Jackson",...,"spotifySearchQuery":"Michael Jackson - Thriller"}}
{"type":"event","data":{"id":"evt_3","date":"1990","year":1990,"title":"Beverly Hills 90210","description":"...","category":"entertainment","visualSubjectType":"tv","isTV":true,...}}
{"type":"event","data":{"id":"evt_4","date":"1982","year":1982,"title":"E.T.","description":"...","category":"entertainment","visualSubjectType":"movie","isMovie":true,...,"movieSearchQuery":"E.T. trailer 1982"}}

NA ALLE EVENTS:
{"type":"summary","data":"Samenvatting..."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1950,"imageSearchQuery":"Naam"}]}

REGELS:
1. GEEN markdown.
2. Genereer ${eventCount} events.
3. Vul 'visualSubjectType' ALTIJD in. KIES 'tv' voor TV-series, 'movie' ALLEEN voor bioscoopfilms!
4. Zet 'isTV: true' voor ALLE TV-series (Dallas, Baywatch, Beverly Hills 90210, Friends, Seinfeld, etc.)
5. Zet 'isMovie: true' ALLEEN voor bioscoopfilms (E.T., Titanic, Star Wars, etc.)
6. Vul 'spotifySearchQuery' / 'movieSearchQuery' in waar relevant.`;
}

// =============================================================================
// USER PROMPT TEMPLATES
// =============================================================================
export const BIRTHDATE_PROMPT_SHORT = (
  day: number,
  monthName: string,
  year: number,
  maxEvents: number,
  contentFocus: string
) =>
  `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer PRECIES ${maxEvents} events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: Minimaal 2, Maximaal 4 (Nr 1 hits).
- BEROEMDHEDEN: Maximaal 2.
${contentFocus}`;

export const BIRTHDATE_PROMPT_FULL = (
  day: number,
  monthName: string,
  year: number,
  contentFocus: string
) =>
  `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer 50 events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: 5-10 events.
- BEROEMDHEDEN: Max 5.
${contentFocus}`;

export const RANGE_PROMPT = (
  startYear: number,
  endYear: number,
  targetEvents: number,
  contentFocus: string
) =>
  `ROL & CONTEXT:
Je bent een nostalgische verhalenverteller.
${contentFocus}

DE OPDRACHT:
Maak een gedetailleerde tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.
Let op: Verdeel de events gelijkmatig (bv. in blokken van 2 jaar) en behoud de kwaliteit en detaillering tot aan het laatste event.

${NOSTALGIA_INSTRUCTIONS}`;

export const FAMOUS_BIRTHDAYS_ADDITION = (
  day: number,
  monthName: string
) =>
  `\n\n--- EXTRA TAAK: VERJAARDAGEN ---\nZoek 3 bekende personen die op ${day} ${monthName} jarig zijn (dit staat los van de tijdlijn).`;

export const BIRTHYEAR_IN_RANGE_ADDITION = (year: number) =>
  `\nHet geboortejaar ${year} is speciaal: focus hier extra op.`;

export const PERSONAL_NAME_ADDITION = (fullName: string) => 
  `\nTijdlijn voor: ${fullName}.`;

export const GEOGRAPHIC_FOCUS: Record<string, string> = {
  netherlands: "\nFocus: Nederland.",
  europe: "\nFocus: Europa.",
  world: "\nFocus: Wereld.",
};

export const INTERESTS_ADDITION = (interests: string) => 
  `\nInteresses: ${interests}.`;

export const CITY_ADDITION = (city: string) => `
CRUCIAAL - LOKALE LENS (${city}):
De gebruiker groeide op in **${city}**.
Dit is de bril waardoor je de hele bovenstaande tijdlijn bekijkt en inkleurt.
1. **Lokale Hotspots:** Noem specifieke discotheken, bioscopen, scholen of hangplekken in ${city} (indien bekend).
2. **Lokale Sfeer:** Beschrijf het specifieke gevoel van wonen in ${city} (Provinciaal vs Stedelijk).
3. **Events:** Was er een groot lokaal evenement of feest in die jaren?`;

export const CHILDREN_ADDITION = (childrenInfo: string[]) => 
  `\nKinderen: ${childrenInfo.join(", ")}`;

export const GENDER_ADDITION = (gender: 'male' | 'female') => {
  const genderText = gender === 'male' ? 'man' : 'vrouw';
  return `\nDe persoon voor wie deze tijdlijn is, is een ${genderText}. Pas de beschrijvingen subtiel aan zodat ze herkenbaar zijn vanuit dit perspectief.`;
};

export const ATTITUDE_ADDITION = (attitude: 'conservative' | 'progressive') => {
  const attitudeText = attitude === 'conservative' 
    ? 'conservatieve/traditionele' 
    : 'progressieve/vooruitstrevende';
  return `\nDe persoon heeft een ${attitudeText} levenshouding. Kies events en beschrijf ze op een manier die resoneert met dit perspectief (zonder politiek te worden).`;
};
