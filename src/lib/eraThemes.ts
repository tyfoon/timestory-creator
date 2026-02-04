// Era-based visual themes for the nostalgic homepage

export type EraType = 'pre70s' | '70s' | '80s' | '90s' | '2000s' | '2010s' | 'modern';

export interface EraTheme {
  era: EraType;
  primary: string;       // Main color (CSS variable value)
  secondary: string;     // Secondary color
  accent: string;        // Accent/highlight color
  background: string;    // Background tint
  fontFamily: string;    // Display font suggestion
  pattern: 'none' | 'grid' | 'dots' | 'memphis' | 'noise';
}

// Year facts for flash cards - expanded with more entries
export const yearFacts: Record<number, { nl: string; en: string }> = {
  1950: { nl: "De Berenschot enquête: 95% van de Nederlanders heeft nog geen TV", en: "Only 5% of Dutch households own a TV" },
  1955: { nl: "De eerste McDonald's opent in Amerika", en: "The first McDonald's opens in America" },
  1960: { nl: "JFK wordt president van de VS", en: "JFK becomes President of the USA" },
  1963: { nl: "Martin Luther King's 'I Have a Dream' speech", en: "Martin Luther King's 'I Have a Dream' speech" },
  1965: { nl: "The Sound of Music wordt een filmklassieker", en: "The Sound of Music becomes a film classic" },
  1969: { nl: "Neil Armstrong zet voet op de maan", en: "Neil Armstrong walks on the moon" },
  1970: { nl: "De Beatles gaan uit elkaar", en: "The Beatles break up" },
  1972: { nl: "Eerste email ooit verzonden", en: "First email ever sent" },
  1975: { nl: "Microsoft wordt opgericht door Bill Gates", en: "Microsoft is founded by Bill Gates" },
  1977: { nl: "Star Wars komt uit en de Atari 2600 is geboren", en: "Star Wars releases and the Atari 2600 is born" },
  1979: { nl: "De Sony Walkman revolutioneert muziek luisteren", en: "Sony Walkman revolutionizes listening to music" },
  1980: { nl: "John Lennon wordt vermoord", en: "John Lennon is assassinated" },
  1981: { nl: "MTV start en verandert muziek voor altijd", en: "MTV launches and changes music forever" },
  1982: { nl: "Michael Jackson brengt Thriller uit", en: "Michael Jackson releases Thriller" },
  1983: { nl: "De CD vervangt langzaam de LP", en: "CDs slowly replace vinyl records" },
  1984: { nl: "Apple introduceert de Macintosh", en: "Apple introduces the Macintosh" },
  1985: { nl: "Live Aid: het grootste benefietconcert ooit", en: "Live Aid: the largest benefit concert ever" },
  1986: { nl: "De Challenger ramp schokt de wereld", en: "The Challenger disaster shocks the world" },
  1987: { nl: "De eerste Simpsons aflevering op TV", en: "The first Simpsons episode airs on TV" },
  1988: { nl: "Koninginnedag voor het eerst op 30 april", en: "Queen's Day celebrated on April 30 for the first time" },
  1989: { nl: "De Berlijnse Muur valt", en: "The Berlin Wall falls" },
  1990: { nl: "Nelson Mandela komt vrij na 27 jaar", en: "Nelson Mandela is released after 27 years" },
  1991: { nl: "Het World Wide Web wordt openbaar", en: "The World Wide Web goes public" },
  1992: { nl: "Euro Disney opent in Parijs", en: "Euro Disney opens in Paris" },
  1993: { nl: "Jurassic Park breekt bioscooprecords", en: "Jurassic Park breaks box office records" },
  1994: { nl: "Nelson Mandela wordt president van Zuid-Afrika", en: "Nelson Mandela becomes president of South Africa" },
  1995: { nl: "Windows 95 verandert personal computing", en: "Windows 95 changes personal computing" },
  1996: { nl: "Dolly het schaap wordt gekloond", en: "Dolly the sheep is cloned" },
  1997: { nl: "Harry Potter verschijnt voor het eerst", en: "Harry Potter is published for the first time" },
  1998: { nl: "Google wordt opgericht", en: "Google is founded" },
  1999: { nl: "De Millennium Bug houdt iedereen bezig", en: "Y2K bug concerns everyone" },
  2000: { nl: "Het nieuwe millennium begint", en: "The new millennium begins" },
  2001: { nl: "Wikipedia gaat online", en: "Wikipedia goes online" },
  2002: { nl: "De Euro wordt ingevoerd in Nederland", en: "The Euro is introduced in the Netherlands" },
  2003: { nl: "MySpace wordt gelanceerd", en: "MySpace launches" },
  2004: { nl: "Facebook begint op Harvard", en: "Facebook starts at Harvard" },
  2005: { nl: "YouTube gaat online", en: "YouTube goes online" },
  2006: { nl: "Twitter wordt gelanceerd", en: "Twitter launches" },
  2007: { nl: "De eerste iPhone verandert alles", en: "The first iPhone changes everything" },
  2008: { nl: "Obama wordt de eerste zwarte president van de VS", en: "Obama becomes the first Black US president" },
  2009: { nl: "Bitcoin wordt geïntroduceerd", en: "Bitcoin is introduced" },
  2010: { nl: "Instagram wordt gelanceerd", en: "Instagram launches" },
  2011: { nl: "Spotify komt naar Nederland", en: "Spotify arrives in the Netherlands" },
  2012: { nl: "Gangnam Style gaat viraal", en: "Gangnam Style goes viral" },
  2013: { nl: "Koning Willem-Alexander wordt ingehuldigd", en: "King Willem-Alexander is inaugurated" },
  2014: { nl: "Het WK voetbal in Brazilië", en: "FIFA World Cup in Brazil" },
  2015: { nl: "Vluchtelingencrisis bereikt Europa", en: "Refugee crisis reaches Europe" },
  2016: { nl: "Pokémon GO neemt de wereld over", en: "Pokémon GO takes over the world" },
  2017: { nl: "Bitcoin bereikt $20.000", en: "Bitcoin reaches $20,000" },
  2018: { nl: "GDPR gaat in in Europa", en: "GDPR takes effect in Europe" },
  2019: { nl: "Greta Thunberg inspireert klimaatprotesten", en: "Greta Thunberg inspires climate protests" },
  2020: { nl: "COVID-19 verandert de wereld", en: "COVID-19 changes the world" },
  2021: { nl: "Vaccinaties bieden hoop", en: "Vaccinations offer hope" },
  2022: { nl: "Oorlog in Oekraïne schokt Europa", en: "War in Ukraine shocks Europe" },
  2023: { nl: "AI revolutie met ChatGPT", en: "AI revolution with ChatGPT" },
  2024: { nl: "Parijs organiseert de Olympische Spelen", en: "Paris hosts the Olympic Games" },
};

export function getEraTheme(year: number): EraTheme {
  if (year < 1970) {
    return {
      era: 'pre70s',
      primary: '#5D4037',      // Sepia brown
      secondary: '#8D6E63',    // Warm brown
      accent: '#D4AF37',       // Vintage gold
      background: '#F5F0E6',   // Parchment
      fontFamily: "'Playfair Display', serif",
      pattern: 'noise',
    };
  }
  
  if (year < 1980) {
    return {
      era: '70s',
      primary: '#BF6900',      // Burnt orange
      secondary: '#8B5A2B',    // Saddle brown
      accent: '#DAA520',       // Goldenrod
      background: '#FDF5E6',   // Old lace
      fontFamily: "'Playfair Display', serif",
      pattern: 'none',
    };
  }
  
  if (year < 1990) {
    return {
      era: '80s',
      primary: '#FF1493',      // Deep pink / neon
      secondary: '#00CED1',    // Dark turquoise / cyan
      accent: '#FFD700',       // Gold
      background: '#1a1a2e',   // Dark blue-black
      fontFamily: "'VT323', monospace",
      pattern: 'grid',
    };
  }
  
  if (year < 2000) {
    return {
      era: '90s',
      primary: '#0066CC',      // Primary blue
      secondary: '#FFCC00',    // Yellow
      accent: '#FF3366',       // Hot pink
      background: '#FFFFFF',   // White
      fontFamily: "'Anton', sans-serif",
      pattern: 'memphis',
    };
  }
  
  if (year < 2010) {
    return {
      era: '2000s',
      primary: '#333333',      // Dark gray
      secondary: '#0099FF',    // Bright blue
      accent: '#66CC00',       // Lime green
      background: '#F0F0F0',   // Light gray
      fontFamily: "'Source Sans 3', sans-serif",
      pattern: 'dots',
    };
  }
  
  if (year < 2020) {
    return {
      era: '2010s',
      primary: '#2C3E50',      // Dark blue-gray
      secondary: '#E74C3C',    // Flat red
      accent: '#1ABC9C',       // Turquoise
      background: '#FAFAFA',   // Near white
      fontFamily: "'Source Sans 3', sans-serif",
      pattern: 'none',
    };
  }
  
  // 2020s and beyond
  return {
    era: 'modern',
    primary: '#6366F1',        // Indigo
    secondary: '#EC4899',      // Pink
    accent: '#10B981',         // Emerald
    background: '#FAFAFA',     // Near white
    fontFamily: "'Source Sans 3', sans-serif",
    pattern: 'none',
  };
}

export function getYearFact(year: number, lang: 'nl' | 'en' = 'nl'): string | null {
  const fact = yearFacts[year];
  if (fact) {
    return lang === 'nl' ? fact.nl : fact.en;
  }
  return null;
}

// Get closest year with a fact
export function getNearestYearFact(year: number, lang: 'nl' | 'en' = 'nl'): { year: number; fact: string } | null {
  // First try exact match
  if (yearFacts[year]) {
    return { year, fact: lang === 'nl' ? yearFacts[year].nl : yearFacts[year].en };
  }
  
  // Find nearest year with a fact within 5 years
  for (let offset = 1; offset <= 5; offset++) {
    if (yearFacts[year - offset]) {
      return { 
        year: year - offset, 
        fact: lang === 'nl' ? yearFacts[year - offset].nl : yearFacts[year - offset].en 
      };
    }
    if (yearFacts[year + offset]) {
      return { 
        year: year + offset, 
        fact: lang === 'nl' ? yearFacts[year + offset].nl : yearFacts[year + offset].en 
      };
    }
  }
  
  return null;
}
