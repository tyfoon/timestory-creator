

## Plan: Betrouwbare #1 Hits via Hardcoded Dataset

### Probleem
De Spotify Search API is tekst-gebaseerd, niet chart-gebaseerd. De huidige query `"number one hit single [jaar]"` vindt letterlijk nummers die zo heten (obscure tracks), niet daadwerkelijke #1 hits.

### Oplossing
Gebruik een hardcoded lijst van echte #1 hits per jaar (1960-2025) en zoek die op naam+artiest via Spotify.

### Stappen

**1. Nieuwe data-file: `src/data/numberOneHits.ts`**
- Maak een object/map met per jaar een `{ artist: string, title: string }` van een bekende #1 hit
- Dekking: 1960 t/m 2025 (66 entries)
- Voorbeelden:
  - 1980: "Call Me" - Blondie
  - 1992: "I Will Always Love You" - Whitney Houston  
  - 2003: "Crazy in Love" - Beyonce
  - 2015: "Uptown Funk" - Mark Ronson ft. Bruno Mars
  - 2023: "Flowers" - Miley Cyrus

**2. Aanpassing `ParallaxMusicColumn.tsx`**
- Importeer de hits-lijst
- Voor elk geselecteerd jaar: haal `artist` en `title` op uit de lijst
- Stuur naar Spotify als `"Artist - Title"` formaat (de edge function parsed dit al correct naar `track:"Title" artist:"Artist"`)
- Verwijder het `year` filter uit de query (niet meer nodig, we zoeken op exacte naam)

**3. Aanpassing `search-spotify` edge function**
- Geen wijzigingen nodig: de "Artist - Title" parsing en het `year` filter werken al correct
- Het `year` filter kan optioneel meegegeven blijven als extra precisie

### Waarom dit werkt
- De Spotify query wordt bijv. `track:"Uptown Funk" artist:"Mark Ronson"` in plaats van `"number one hit single 2015"`
- Dit levert vrijwel altijd een exact match op
- Geen afhankelijkheid van een externe chart-API

### Technische details
- De hardcoded lijst is ~3KB en bevat 66 entries
- Selectie van 40 uit de relevante range blijft werken via de bestaande `selectedYears` logica
- Jaren zonder entry in de lijst worden overgeslagen

