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

// =============================================================================
// NOSTALGIE ENGINE (DYNAMISCH PER REGIO)
// =============================================================================
export const GET_NOSTALGIA_INSTRUCTIONS = (geoFocus: string) => {
  // Vertaal de technische focus naar leesbare regio-context
  const regionMap: Record<string, string> = {
    netherlands: "Nederland en gebruik de context van de plaats en provenciaal versus stad",
    europe: "Europa (focus op lokale culturen, geen Amerikaanse dominantie)",
    world: "Internationaal / Wereldwijd",
    usa: "Verenigde Staten", // Voor het geval je dit later toevoegt
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
   - *ALS FOCUS NEDERLAND IS:* Vermijd Amerikaanse clichés zoals "Prom Night", "Yearbook", "Twinkies" of merken die hier niet te koop waren. Gebruik lokale equivalenten (Schoolfeest, Vriendenboekje, Raider, Studio Line).
   - *ALS FOCUS EUROPA IS:* Zoek naar merken die pan-Europees waren of specifiek voor het land in de context.
   - *ALS FOCUS WERELD IS:* Dan mag je bredere, internationale (US) merken gebruiken.

2. **Check de Doelgroep in deze regio:**
   - Klopt het gebruik van het product met de lokale gewoonten in **${regionName}**?
   - *Voorbeeld:* In Nederland fietst men naar school (natte haren, regenpakken) of de bus (openbaar vervoer). In de VS neemt men de schoolbus (gele bus). Kies het juiste beeld!

3. **Merk-Check:** Gebruik alleen merknamen als je 100% zeker weet dat ze in deze periode en in **${regionName}** dominant waren. Bij twijfel: beschrijf het object ("Een pot knalgele gel").
`;
};
// =============================================================================
// HELPER: VISUAL DIRECTOR INSTRUCTIES
// =============================================================================
const VISUAL_DIRECTOR_INSTRUCTIONS = `
ROL: BEELDREDACTEUR (CRUCIAAL)
Jij bepaalt NIET ALLEEN de zoekterm, maar ook het TYPE afbeelding ('visualSubjectType').
Dit helpt de zoekmachine om de juiste database te kiezen (Film database, Product database, etc).

🔊 GELUIDSEFFECTEN (VERPLICHT VOOR ELKE EVENT!)
Vul ALTIJD 'soundEffectSearchQuery' in met een Engelse zoekterm (max 4 woorden) voor een passend SFEERVOL achtergrondgeluid.
Dit wordt gebruikt voor atmosferische geluiden in de video-versie.

BELANGRIJK - VOEG DECADE TOE VOOR BETERE RESULTATEN:
- Voeg het decennium toe wanneer relevant: "80s disco music", "90s rave synth", "70s funk beat"
- Dit helpt om era-specifieke geluiden te vinden die passen bij de periode

KIES LANGERE ATMOSFERISCHE GELUIDEN (geen korte effecten):
- Muziek: "80s disco beat", "90s techno beat", "crowd cheering concert", "vinyl record playing"
- Film/TV: "movie theater ambience", "tv show audience", "dramatic orchestral music"
- Sport: "stadium crowd cheering", "football match ambience", "race car engine loop"
- Politiek: "parliament session ambience", "crowd protest chanting", "press conference cameras"
- Technologie: "80s arcade game", "90s modem connecting", "computer room ambience", "retro game music"
- Cultuur: "80s synth pop", "90s grunge guitar", "disco dancefloor", "punk rock crowd"
- Wetenschap: "rocket launch rumble", "space station ambience", "laboratory equipment"
- Geboorte/Verjaardag: "birthday party crowd", "children playing", "celebration cheering"

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
// SYSTEM PROMPT - NDJSON STREAMING
// =============================================================================
export function getNDJSONSystemPrompt(language: string, maxEvents?: number): string {
  const langInstruction = LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.nl;
  const isShort = maxEvents && maxEvents <= 20;
  const eventCount = isShort ? maxEvents : 50;

  return `Je bent een meesterlijke verhalenverteller die geschiedenis tot leven wekt.
Je schrijfstijl is:
1. **Zintuiglijk:** Beschrijf geur, geluid en sfeer.
2. **Nostalgisch:** Focus op het gevoel van 'toen'.
3. **Persoonlijk:** Bekijk de wereld door de ogen van de hoofdpersoon.

${langInstruction}

${VISUAL_DIRECTOR_INSTRUCTIONS}

KRITISCH - OUTPUT FORMAAT (NDJSON):
Stuur output als aparte JSON-objecten op NIEUWE regels.

⚡ VERPLICHTE VOLGORDE - STORY EERST! ⚡
Om de gebruiker direct content te tonen MOET je beginnen met storyTitle en storyIntroduction:

1. EERST (direct als eerste output!):
{"type":"storyTitle","data":"[Pakkende titel van max 10 woorden die de essentie van deze periode vangt]"}
{"type":"storyIntroduction","data":"[Max 150 woorden nostalgische introductietekst in tweede persoon]"}

2. DAARNA alle events:
{"type":"event","data":{"id":"evt_1","date":"1980-05-22","year":1980,"title":"Pac-Man","description":"...","category":"entertainment","visualSubjectType":"logo","imageSearchQuery":"Pac-Man","imageSearchQueryEn":"Pac-Man","importance":"high","eventScope":"period"}}
{"type":"event","data":{"id":"evt_2","date":"1982","year":1982,"title":"Thriller","description":"...","category":"music","visualSubjectType":"artwork","imageSearchQuery":"Thriller Michael Jackson","imageSearchQueryEn":"Thriller Michael Jackson","importance":"high","eventScope":"period","spotifySearchQuery":"Michael Jackson - Thriller"}}
{"type":"event","data":{"id":"evt_3","date":"1990","year":1990,"title":"Beverly Hills 90210","description":"...","category":"entertainment","visualSubjectType":"tv","isTV":true,"imageSearchQuery":"Beverly Hills 90210","imageSearchQueryEn":"Beverly Hills 90210","importance":"high","eventScope":"period"}}
{"type":"event","data":{"id":"evt_4","date":"1982","year":1982,"title":"E.T.","description":"...","category":"entertainment","visualSubjectType":"movie","isMovie":true,"imageSearchQuery":"E.T.","imageSearchQueryEn":"E.T. the Extra-Terrestrial","importance":"high","eventScope":"period","movieSearchQuery":"E.T. trailer 1982"}}

3. NA ALLE EVENTS:
{"type":"summary","data":"Korte samenvatting..."}
{"type":"famousBirthdays","data":[{"name":"Naam","profession":"Beroep","birthYear":1950,"imageSearchQuery":"Naam"}]}

RICHTLIJNEN VOOR storyTitle (EERST genereren!):
- Max 10 woorden, pakkend en emotioneel
- Vang de essentie van de periode (bv. "Van cassettebandje naar cd: jouw jaren tachtig")
- Mag poëtisch zijn, maar moet herkenbaar blijven

RICHTLIJNEN VOOR storyIntroduction (DIRECT NA storyTitle!):
- Max 150 woorden
- Schrijf in tweede persoon: "Je werd geboren...", "Je hoorde...", "Je voelde..."
- Gebruik zintuiglijke details: geuren (brommerbenzine, Sunsilk shampoo), geluiden (piepende modem, rinkelende telefoon)
- Beschrijf de 'analoge vertraging': wachten op foto's, brieven schrijven, teletekst checken
- Maak het emotioneel en persoonlijk - dit is GEEN opsomming van feiten

REGELS:
1. GEEN markdown.
2. BEGIN MET storyTitle en storyIntroduction - dit geeft de gebruiker direct iets te lezen!
3. Genereer daarna ${eventCount} events.
4. Vul 'visualSubjectType' ALTIJD in. KIES 'tv' voor TV-series, 'movie' ALLEEN voor bioscoopfilms!
5. Zet 'isTV: true' voor ALLE TV-series (Dallas, Baywatch, Beverly Hills 90210, Friends, Seinfeld, etc.)
6. Zet 'isMovie: true' ALLEEN voor bioscoopfilms (E.T., Titanic, Star Wars, etc.)
7. Vul 'spotifySearchQuery' / 'movieSearchQuery' in waar relevant.`;
}

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
                  enum: ["person", "movie", "tv", "product", "logo", "event", "location", "artwork", "culture"],
                  description:
                    "CRITICAL: The visual category. 'movie' = FILMS only, 'tv' = TV SERIES only (Dallas, Beverly Hills 90210, etc).",
                },
                imageSearchQuery: { type: "string" },
                imageSearchQueryEn: {
                  type: "string",
                  description: "Specific English search term matching the visualSubjectType rules.",
                },
                importance: { type: "string", enum: ["high", "medium", "low"] },
                eventScope: { type: "string", enum: ["birthdate", "birthmonth", "birthyear", "period"] },
                isCelebrityBirthday: { type: "boolean" },
                isMovie: { type: "boolean", description: "True ONLY for cinema FILMS (not TV series)" },
                isTV: {
                  type: "boolean",
                  description: "True ONLY for TV SERIES/SHOWS (Dallas, Beverly Hills 90210, Swiebertje, etc)",
                },
                spotifySearchQuery: { type: "string" },
                movieSearchQuery: { type: "string" },
                soundEffectSearchQuery: {
                  type: "string",
                  description:
                    "A short, specific English search query for a sound effect that matches this event (e.g. 'camera shutter', 'applause', '8-bit game sound', 'techno beat loop', 'printing press'). Keep it under 3 words.",
                },
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
                "soundEffectSearchQuery",
              ],
            },
          },
          summary: { type: "string" },
          storyTitle: {
            type: "string",
            description: "Pakkende titel van max 10 woorden die de essentie van de periode vangt",
          },
          storyIntroduction: {
            type: "string",
            description:
              "Max 150 woorden nostalgische introductietekst in tweede persoon, met zintuiglijke details en emotie",
          },
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
        required: ["events", "summary", "storyTitle", "storyIntroduction"],
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

  return `Je bent een assistent die historische tijdlijnen maakt, maar met een twist.
BELANGRIJK: Beschrijf elk event niet als een droog nieuwsbericht, maar als een **persoonlijke herinnering**.
Focus op de *sociale ongemakkelijkheid*, de *absurde trends* en de *vergeten details*.
Het doel is om bij de gebruiker een van deze drie reacties op te roepen:
1. LOL (Humor & Zelfspot): "Wat zagen we eruit!"
2. OMG (Herkenning): "O ja, dat was ik helemaal vergeten!"
3. WTF (Ongeloof): "Was dat toen echt normaal?!"

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
// =============================================================================
// NIEUW: GENERATIE PERSPECTIEF (Wie is de klant NU?)
// =============================================================================
export function getGenerationPerspective(birthYear: number): string {
  if (birthYear <= 1964) {
    return `GENERATIE PERSPECTIEF (Baby Boomer - De Bouwers):
    Focus: Optimisme, wederopbouw, en collectieve vooruitgang.
    Toon: Respectvol en waarderend voor de stijgende welvaart.
    Memory Bump: De landing op de maan, de introductie van kleuren-TV.`;
  } else if (birthYear <= 1980) {
    return `GENERATIE PERSPECTIEF (Gen X - De Onafhankelijken):
    Psychologie: "Unplugged" jeugd, sleutelkind-generatie.
    Focus: AUTONOMIE, RISICO & VRIJHEID. Benadruk de vrijheid van fietsen zonder mobiel, 'buiten spelen tot de lantaarnpalen aan gaan', en de eerste bijbaan.
    Nostalgie: Het "rauwe" randje, imperfectie, en fysieke media (cassettes opnemen).`;
  } else if (birthYear <= 1996) {
    return `GENERATIE PERSPECTIEF (Millennial - De Overbruggers):
    Psychologie: Opgegroeid analoog, volwassen geworden digitaal.
    Focus: DE TRANSITIE. De magie van de eerste trage internetverbinding, MSN, Limewire, maar ook Harry Potter en Pokémon.
    Nostalgie: "Escapisme" naar een veiligere tijd vóór 9/11 en de crisis.`;
  } else {
    return `GENERATIE PERSPECTIEF (Gen Z - De Digital Natives):
    Psychologie: "Slow Life" strategie & Identiteit.
    Focus: ESTHETIEK & VEILIGHEID. Ze hebben nostalgie voor tijdperken die ze zelf niet hebben meegemaakt (de "vibe" van de 90s).
    Belangrijk: Focus minder op fysieke mijlpalen (rijbewijs, bijbaan) en meer op digitale cultuur, fandoms, en "aesthetic".`;
  }
}

// =============================================================================
// AANGEPAST: CONTENT FOCUS (Met WEL/NIET filters)
// =============================================================================
export function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case "birthyear":
      return `FOCUS: Het geboortejaar. Beschrijf de wereld waarin de wieg stond. Welke liedjes stonden op 1? Wat was het 'gesprek van de dag' bij de buren?`;

    case "childhood":
      return `FOCUS: Kindertijd (4-12 jaar). De wereld is klein en magisch.
      WEL: Speelgoed, tekenfilms, snoep, schoolplein-spelletjes, kinderprogramma's, sneeuwpret, Sinterklaas, je ouders.
      NIET: Politiek, oorlogen, economische crises (tenzij ouders erover fluisterden), saaie 'grote mensen' zaken.`;

    case "puberty":
      return `FOCUS: Puberteit (11-17 jaar). De 'bubbel' van de tiener met nadruk op het sociale leven.
      WEL: De 'uitgaans-economie' (sparen voor entree, muntjes), discotheken (de hiërarchie, de portier, de 'slow'), versierpogingen, trends in uitgaanskleding (merkjes, haardracht), geuren (parfum/aftershave van die periode), schoolfeesten en brommers.
      NIET: Amerikaanse politiek, verdragen, beursnieuws. Voor een puber bestaat Washington niet, de discotheek wel.`;

    case "young-adult":
      return `FOCUS: Jongvolwassenheid (18-25 jaar). De wereld gaat open.
      WEL: Festivals, studentenleven, eerste baan, reizen, politiek bewustzijn (nu wel!), technologische doorbraken, samenwonen.
      NIET: Kinderachtige zaken. Focus op onafhankelijkheid en ontdekking.`;

    default:
      return `FOCUS: Algemene mix van belangrijke wereldgebeurtenissen, cultuur en entertainment.`;
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
  geoFocus: string = "netherlands",
  birthYear?: number,
) => {
  // Calculate actual ages for the period if birthYear is provided
  let ageContext = "";
  if (birthYear) {
    const ageAtStart = startYear - birthYear;
    const ageAtEnd = endYear - birthYear;
    ageContext = `
⚠️ CRUCIALE LEEFTIJDSBEREKENING ⚠️
Geboortejaar: ${birthYear}
Leeftijd aan het BEGIN van deze periode (${startYear}): **${ageAtStart} jaar**
Leeftijd aan het EINDE van deze periode (${endYear}): **${ageAtEnd} jaar**

GEBRUIK DEZE EXACTE LEEFTIJDEN! Bereken voor elk event: leeftijd = eventyear - ${birthYear}
Voorbeeld: In ${startYear} is de gebruiker ${ageAtStart} jaar oud. In ${endYear} is de gebruiker ${ageAtEnd} jaar oud.
`;
  }

  return `ROL & CONTEXT:
Je bent een nostalgische verhalenverteller.
${contentFocus}

DE OPDRACHT:
Maak een gedetailleerde tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.
${ageContext}
LEEFTIJDS-PROGRESSIE (GROEIPROCES):
De gebruiker wordt elk jaar ouder. De interesses MOETEN meegroeien met de jaren.
1. **Rekenwerk:** Bereken voor elk event de EXACTE leeftijd: eventyear - geboortejaar${birthYear ? ` (${birthYear})` : ""}.
2. **De 'Eerste Keer' Regel:** Plaats mijlpalen pas op de leeftijd dat ze logisch zijn.
   - *0-3 jaar:* Baby/peuter. Alleen grote wereldgebeurtenissen, geen persoonlijke herinneringen.
   - *4-6 jaar:* Kleuter. Sesamstraat, kleuterschool, eerste speelgoed.
   - *7-11 jaar:* Basisschool. Speelgoed, tekenfilms, snoep, schoolplein-spelletjes.
   - *12-13 jaar:* Brugklas, speelgoed wordt minder, eerste muziekidolen, schoolfeestjes.
   - *14-15 jaar:* Huiswerkstress, vriendengroepen, verliefdheid, rages, kleedgeld.
   - *16-17 jaar:* Brommers/scooters, eerste bijbaan, uitgaan (discotheken), examenstress, rijles.
   - *18+ jaar:* Rijbewijs, studeren, zelfstandigheid, stemrecht.

${GET_NOSTALGIA_INSTRUCTIONS(geoFocus)}`;
};

export const FAMOUS_BIRTHDAYS_ADDITION = (day: number, monthName: string, startYear: number, endYear: number) =>
  `\n\n--- EXTRA TAAK: VERJAARDAGEN ---\nZoek 3 bekende personen die op ${day} ${monthName} jarig zijn (dit staat los van de tijdlijn).`;

export const BIRTHYEAR_IN_RANGE_ADDITION = (year: number) =>
  `\nHet geboortejaar ${year} is speciaal: focus hier extra op.`;

export const PERSONAL_NAME_ADDITION = (fullName: string) => `\nTijdlijn voor: ${fullName}.`;

export const GEOGRAPHIC_FOCUS: Record<string, string> = {
  netherlands: "\nFocus: Nederland.",
  europe: "\nFocus: Europa.",
  world: "\nFocus: Wereld.",
};

export const INTERESTS_ADDITION = (interests: string) => `\nInteresses: ${interests}.`;

export const CITY_ADDITION = (city: string) => `
CRUCIAAL - LOKALE LENS (${city}):
De gebruiker groeide op in **${city}**.
Dit is het decor. Omdat exacte namen van toen soms vervaagd zijn, gebruik je **archetypische beschrijvingen** die passen bij ${city}:
1. **De Hotspots:** Beschrijf de lokale 'kelderdiscotheek', de snackbar op de hoek van de markt, en de vaste hangplek (bijv. 'bij de fontein' of 'het plein').
2. **De Route:** Beschrijf de rit (fiets/brommer) vanuit de wijk/dorp naar het centrum van ${city}.
3. **Lokale Sfeer:** Beschrijf het specifieke gevoel van wonen in ${city} (Provinciaal vs Stedelijk) en de rivaliteit met omliggende plaatsen.`;

export const CHILDREN_ADDITION = (childrenInfo: string[]) => `\nKinderen: ${childrenInfo.join(", ")}`;

// =============================================================================
// PERSOONLIJKE HERINNERINGEN (vrienden, school, uitgaan)
// =============================================================================
export const PERSONAL_MEMORIES_ADDITION = (friends?: string, school?: string, nightlife?: string) => {
  const parts: string[] = [];

  if (friends) {
    parts.push(
      `**Beste vrienden:** ${friends}. Verwijs in verhalen naar deze namen als je sociale context nodig hebt.`,
    );
  }

  if (school) {
    parts.push(`**Middelbare school:** ${school}. Gebruik deze schoolnaam voor schoolgerelateerde herinneringen.`);
  }

  if (nightlife) {
    parts.push(
      `**Favoriete uitgaansplekken:** ${nightlife}. Dit zijn de plekken waar de avonden doorgebracht werden - noem ze bij naam!`,
    );
  }

  if (parts.length === 0) return "";

  return `
PERSOONLIJKE HERINNERINGEN (VERWERK DIT SUBTIEL):
${parts.join("\n")}

Weef deze specifieke details door de verhalen heen. Als je bijvoorbeeld schrijft over uitgaan of muziek, noem dan de daadwerkelijke club/disco naam. Bij schoolherinneringen, noem de echte school.
Dit maakt de tijdlijn persoonlijk en herkenbaar!`;
};

export const GENDER_ADDITION = (gender: "male" | "female") => {
  if (gender === "male") {
    return `
GENDER LENS (MAN):
Bekijk de events vanuit het perspectief van een jongen/man die opgroeit in deze tijd.
1. **Kindertijd (4-12):** Focus op **actie, constructie en competitie**.
   - *Speelgoed:* Lego, technisch speelgoed, auto's (Matchbox/Hot Wheels), soldaatjes, actiefiguren (He-Man, Transformers, G.I. Joe) en de eerste spelcomputers (Gameboy).
   - *Spel:* Buitenspelen was vaak fysiek en risicovoller (klimmen, crossen op de fiets, fikkie stoken).
2. **Puberteit (13-18):** Focus op **onafhankelijkheid, status en rebellie**.
   - *Interesses:* Brommers/scooters, technische gadgets, de eerste computer, "cool" zijn in de groep, en muziek als identiteitsstatement (Hiphop, Rock, Gabber - "ergens tegenaan schoppen").
   - *Sfeer:* Minder praten over gevoelens, meer "dingen doen" met vrienden.`;
  }

  if (gender === "female") {
    return `
GENDER LENS (VROUW):
Bekijk de events vanuit het perspectief van een meisje/vrouw die opgroeit in deze tijd.
1. **Kindertijd (4-12):** Focus op **sociale connectie, verzamelen en verbeelding**.
   - *Speelgoed:* Poppen (Barbie, Cindy), verzamelrages (Stickers, Diddl, Flippo's), My Little Pony, Care Bears, en creatief speelgoed.
   - *Spel:* Rollenspellen (vadertje en moedertje), elastieken, dagboeken bijhouden en vriendenboekjes.
2. **Puberteit (13-18):** Focus op **sociale binding, 'bedroom culture' en emotie**.
   - *Interesses:* Magazines (Tina, Fancy, Hitkrant), urenlang aan de telefoon hangen (of MSN'en), logeerpartijtjes.
   - *Muziek:* Muziek als sociale "lijm" (samen meezingen, boybands, emotionele ballads). De "Music Memory Bump" ligt hier iets later (rond 19 jaar) en is socialer van aard.
   - *Sfeer:* "Bedroom culture": samen op de kamer muziek luisteren, make-uppen en praten over verliefdheid.`;
  }

  return "";
};

export const SUBCULTURE_ADDITION = (myGroup: string, otherGroupsFromEra: string[], geoFocus: string) => {
  const othersList = otherGroupsFromEra.filter((g) => g.toLowerCase() !== myGroup.toLowerCase()).join(", ");

  // Bepaal context voor merken
  const locationContext = geoFocus === "netherlands" ? "in Nederland" : "in deze regio";

  return `
SUBCULTUUR & IDENTITEIT (WIJ vs DE REST):
De gebruiker hoorde bij: **"${myGroup}"**.

1. **De 'In-Group' (Wij):**
   - Focus op de muziek, kleding en **MERKEN** die statussymbolen waren voor **${myGroup}** ${locationContext}.
   - *Check:* Zijn deze merken logisch voor ${locationContext}? (Bijv. in NL: Australian trainingspakken voor Gabbers, kistjes voor Alto's).
   
2. **De 'Out-Group' (Zij - ${othersList}):**
   - Hoe keken wij naar hen? (Arrogantie, angst, afkeer?)

3. **Merk-Validatie:** Gebruik alleen merken die deze specifieke groep **${locationContext}** gebruikte. Vermijd generieke Amerikaanse merken als ze hier niet "cool" waren.
`;
};
export const GET_MUSIC_INSTRUCTIONS = (gender: "male" | "female" | "none") => {
  if (gender === "male") {
    return `MUZIEK SELECTIE (MAN): Focus op de "Rebellious Years" (rond 16 jaar). Kies nummers die identiteit en onafhankelijkheid uitstralen (Rock, Hip-hop, ruwere genres).`;
  } else if (gender === "female") {
    return `MUZIEK SELECTIE (VROUW): Focus op de "Social Bonding Years" (rond 19 jaar en ouder). Kies nummers die je samen met vriendinnen zong, emotionele ballads en 'anthems'.`;
  }
  return `MUZIEK SELECTIE: Focus op de absolute tophits uit de leeftijd 16-20 jaar.`;
};
