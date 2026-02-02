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
export const GET_NOSTALGIA_INSTRUCTIONS = (geoFocus: string) => {
  const regionMap: Record<string, string> = {
    netherlands: "Nederland (specifiek de Nederlandse polder-cultuur)",
    europe: "Europa (focus op lokale culturen, geen Amerikaanse dominantie)",
    world: "Internationaal / Wereldwijd",
  };
  const regionName = regionMap[geoFocus] || "de regio van de gebruiker";

  return `
RICHTLIJNEN VOOR SFEER & STIJL:
1. **Zintuiglijke Details:** Beschrijf geuren, geluiden en tactiele gevoelens.
2. **Analoge Vertraging:** Benadruk het wachten, spoelen en fysieke karakter van media.
3. **Persoonlijke Toon:** Bekijk alles door de bril van de leeftijd die de gebruiker toen had.

⚠️ CRUCIAAL - CULTURELE VALIDATIE (${regionName.toUpperCase()}) ⚠️
De AI heeft een bias naar Amerikaanse popcultuur. Corrigeer dit op basis van de gekozen regio: **${regionName}**.

1. **Check de Markt:** Was dit product *echt* een icoon in **${regionName}**?
2. **Check de Doelgroep in deze regio:** Klopt het gebruik met de lokale gewoonten?
3. **Merk-Check:** Gebruik alleen merknamen als je 100% zeker weet dat ze in deze periode en in **${regionName}** dominant waren.
`;
};

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
- NOOIT type-woorden: "film", "serie", "show", "programma", "album", "single", "boek"
- type 'person': ALLEEN de naam. "David Bowie" (NIET "David Bowie zanger")
- type 'movie': ALLEEN de titel. "E.T." (NIET "E.T. film", NIET "E.T. de film")
- type 'tv': ALLEEN de titel. "Dallas" (NIET "Dallas serie", NIET "Dallas TV")
- type 'product': ALLEEN productnaam. "Star Wars actiefiguren" (NIET "Star Wars actiefiguren Kenner")
- UITZONDERING: Voor de originele Sony Walkman uit 1979: "Sony Walkman TPS-L2" (het specifieke model)
- type 'logo': ALLEEN de naam. "Pac-Man" (NIET "Pac-Man logo", NIET "Pac-Man Namco")
- type 'artwork': Artiest + titel. "Thriller Michael Jackson" (NIET "Thriller album")
- type 'culture': SPECIFIEK object/stijl. "Breakdance", "Disco bal"

REGELS VOOR 'imageSearchQueryEn' (ENGELS):
- NOOIT jaartallen: "1980", "1990", "2000"  
- NOOIT decennia: "80s", "90s", "1980s", "eighties", "nineties"
- NOOIT extra context: fabrikanten, merknamen die niet in de titel staan
- NOOIT type-woorden: "film", "movie", "series", "show", "program", "album", "single", "book"
- type 'person': ALLEEN de naam. "David Bowie" (NIET "David Bowie singer")
- type 'movie': ALLEEN de titel. "E.T." (NIET "E.T. film", NIET "E.T. the movie")
- type 'tv': ALLEEN de titel. "Dallas" (NIET "Dallas series", NIET "Dallas TV show")
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
// GENERATIE PERSPECTIEF (Wie is de klant NU?)
// =============================================================================
export function getGenerationPerspective(birthYear: number): string {
  if (birthYear <= 1964) {
    return `GENERATIE PERSPECTIEF (Baby Boomer):
De klant is nu een 60-plusser. Kijk terug met een gevoel van rijkdom en verandering.
Toon waardering voor de wederopbouw en de enorme welvaartsgroei die ze hebben meegemaakt.`;
  } else if (birthYear <= 1980) {
    return `GENERATIE PERSPECTIEF (Generatie X):
De klant is nu tussen de 45 en 60. Gebruik een nuchtere, no-nonsense toon.
Dit is de 'verloren generatie' die alles zelf moest oplossen. Ze houden van authenticiteit en hebben een hekel aan opsmuk.`;
  } else if (birthYear <= 1996) {
    return `GENERATIE PERSPECTIEF (Millennial):
De klant is nu dertiger of veertiger. Focus op de overgang van analoog naar digitaal.
Er is veel nostalgie naar de 'onschuldige' tijd vóór sociale media en smartphones. Gebruik een toon van 'weet je nog?'.`;
  } else {
    return `GENERATIE PERSPECTIEF (Gen Z):
De klant is een twintiger. Ze zijn 'digital natives'.
Hun nostalgie is esthetisch (Y2K mode, oude digitale camera's). Ze kijken met ironie en verwondering naar de 'oude' wereld.`;
  }
}

// =============================================================================
// CONTENT FOCUS PER PERIODE TYPE
// =============================================================================
export function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case "birthyear":
      return `FOCUS: Het geboortejaar. Beschrijf de wereld waarin de wieg stond. Welke liedjes stonden op 1? Wat was het 'gesprek van de dag' bij de buren?`;

    case "childhood":
      return `FOCUS: Kindertijd (4-12 jaar). De wereld is klein en magisch.
WEL: Speelgoed, tekenfilms, snoep, schoolplein-spelletjes, kinderprogramma's, sneeuwpret, Sinterklaas.
NIET: Politiek, oorlogen, economische crises (tenzij ouders erover fluisterden), saaie 'grote mensen' zaken.`;

    case "puberty":
      return `FOCUS: Puberteit (11-17 jaar). De 'bubbel' van de tiener.
WEL: Muziek (Top 40, videoclips), brommers, eerste verliefdheid, schoolfeesten, rages, mode, TV-series, techniek (Walkman/mobiel).
NIET: Amerikaanse politiek (geen Reagan/Clinton/Bush tenzij pop-cultureel relevant), verdragen, beursnieuws. Voor een puber in de provincie bestaat Washington niet, de discotheek wel.`;

    case "young-adult":
      return `FOCUS: Jongvolwassenheid (18-25 jaar). De wereld gaat open.
WEL: Festivals, studentenleven, eerste baan, reizen, politiek bewustzijn (nu wel!), technologische doorbraken, samenwonen.
NIET: Kinderachtige zaken. Focus op onafhankelijkheid en ontdekking.`;

    default:
      return `FOCUS: Algemene mix van belangrijke wereldgebeurtenissen, cultuur en entertainment.`;
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
  isShort: boolean,
  targetEvents: number,
  contentFocus: string,
  geoFocus: string = "netherlands"
) =>
  `ROL & CONTEXT:
Je bent een nostalgische verhalenverteller.
${contentFocus}

DE OPDRACHT:
Maak een gedetailleerde tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.
Let op: Verdeel de events gelijkmatig (bv. in blokken van 2 jaar) en behoud de kwaliteit en detaillering tot aan het laatste event.

${GET_NOSTALGIA_INSTRUCTIONS(geoFocus)}`;

export const FAMOUS_BIRTHDAYS_ADDITION = (
  day: number,
  monthName: string,
  startYear: number,
  endYear: number
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

export const SUBCULTURE_ADDITION = (myGroup: string, otherGroupsFromEra: string[], geoFocus: string = "netherlands") => {
  const othersList = otherGroupsFromEra
    .filter(g => g.toLowerCase() !== myGroup.toLowerCase())
    .join(", ");

  return `
SUBCULTUUR & IDENTITEIT (WIJ vs DE REST):
De gebruiker hoorde in deze periode bij de groep: **"${myGroup}"**.
Dit is de lens waardoor we naar alles kijken.

1. **De 'In-Group' (Wij):**
   - Focus sterk op de muziek, kleding, taal en hangplekken die cool waren voor **${myGroup}**.
   - Gebruik jargon of slang dat bij deze groep past.
   - Beschrijf het gevoel van verbondenheid met deze 'tribe'.

2. **De 'Out-Group' (Zij - ${othersList}):**
   - De andere stromingen in die tijd waren: ${othersList}.
   - Benadruk het contrast. Als de gebruiker een ${myGroup} was, hoe keken ze dan naar die andere groepen?

3. **Conflicten & Kruisbestuiving:**
   - Waren er specifieke plekken waar deze groepen botsten?
   - Of waren er onverwachte momenten van overlap?

`;
};
