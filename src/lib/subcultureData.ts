import subculturesCsv from '@/data/subcultures.csv?raw';

export interface SubcultureEntry {
  period: string;
  targetGroup: string;
  country: string;
  subcultures: string[];
}

// Parse the CSV data
const parseSubcultures = (): SubcultureEntry[] => {
  const lines = subculturesCsv.trim().split('\n');
  // Skip header row
  const dataLines = lines.slice(1);
  
  return dataLines.map(line => {
    // Handle CSV parsing with potential commas in values
    const parts = line.split(',');
    return {
      period: parts[0].trim(),
      targetGroup: parts[1].trim(),
      country: parts[2].trim(),
      subcultures: parts.slice(3, 8).map(s => s.trim()).filter(Boolean)
    };
  });
};

const subcultureData = parseSubcultures();

// Map period types to target groups
const periodToTargetGroup: Record<string, string> = {
  'puberty': 'Pubers',
  'childhood': 'Pubers', // Use pubers for childhood too
  'young-adult': 'Jong volwassen',
  'birthyear': 'Pubers' // Default to pubers for birth year
};

// Get decade string from year (e.g., 1985 -> "1980s")
const getDecadeString = (year: number): string => {
  const decade = Math.floor(year / 10) * 10;
  return `${decade}s`;
};

// City-to-country mapping for subculture detection
const cityToCountry: Record<string, string> = {
  // Nederland
  amsterdam: 'Nederland', rotterdam: 'Nederland', utrecht: 'Nederland', denhaag: 'Nederland',
  'den haag': 'Nederland', eindhoven: 'Nederland', groningen: 'Nederland', tilburg: 'Nederland',
  almere: 'Nederland', breda: 'Nederland', nijmegen: 'Nederland', arnhem: 'Nederland',
  haarlem: 'Nederland', enschede: 'Nederland', apeldoorn: 'Nederland', amersfoort: 'Nederland',
  maastricht: 'Nederland', leiden: 'Nederland', dordrecht: 'Nederland', zoetermeer: 'Nederland',
  zwolle: 'Nederland', deventer: 'Nederland', delft: 'Nederland', leeuwarden: 'Nederland',
  // Duitsland
  berlin: 'Duitsland', münchen: 'Duitsland', munich: 'Duitsland', hamburg: 'Duitsland',
  köln: 'Duitsland', cologne: 'Duitsland', frankfurt: 'Duitsland', stuttgart: 'Duitsland',
  düsseldorf: 'Duitsland', dortmund: 'Duitsland', essen: 'Duitsland', leipzig: 'Duitsland',
  bremen: 'Duitsland', dresden: 'Duitsland', hannover: 'Duitsland', nürnberg: 'Duitsland',
  // USA
  'new york': 'USA', 'los angeles': 'USA', chicago: 'USA', houston: 'USA', phoenix: 'USA',
  philadelphia: 'USA', 'san antonio': 'USA', 'san diego': 'USA', dallas: 'USA', austin: 'USA',
  seattle: 'USA', denver: 'USA', boston: 'USA', nashville: 'USA', portland: 'USA',
  'san francisco': 'USA', miami: 'USA', atlanta: 'USA', detroit: 'USA', minneapolis: 'USA',
  // UK
  london: 'UK', manchester: 'UK', birmingham: 'UK', leeds: 'UK', glasgow: 'UK',
  liverpool: 'UK', edinburgh: 'UK', bristol: 'UK', sheffield: 'UK', cardiff: 'UK',
  newcastle: 'UK', nottingham: 'UK', brighton: 'UK', oxford: 'UK', cambridge: 'UK',
  // Frankrijk
  paris: 'Frankrijk', marseille: 'Frankrijk', lyon: 'Frankrijk', toulouse: 'Frankrijk',
  nice: 'Frankrijk', nantes: 'Frankrijk', strasbourg: 'Frankrijk', montpellier: 'Frankrijk',
  bordeaux: 'Frankrijk', lille: 'Frankrijk', rennes: 'Frankrijk',
  // Italië
  rome: 'Italië', roma: 'Italië', milan: 'Italië', milano: 'Italië', napoli: 'Italië',
  naples: 'Italië', turin: 'Italië', torino: 'Italië', florence: 'Italië', firenze: 'Italië',
  venice: 'Italië', venezia: 'Italië', bologna: 'Italië', genova: 'Italië',
  // Japan
  tokyo: 'Japan', osaka: 'Japan', kyoto: 'Japan', yokohama: 'Japan', nagoya: 'Japan',
  // Zuid-Korea
  seoul: 'Zuid-Korea', busan: 'Zuid-Korea', incheon: 'Zuid-Korea',
  // Brazilië
  'são paulo': 'Brazilië', 'sao paulo': 'Brazilië', rio: 'Brazilië',
  'rio de janeiro': 'Brazilië', brasilia: 'Brazilië', salvador: 'Brazilië',
  // Australië
  sydney: 'Australië', melbourne: 'Australië', brisbane: 'Australië', perth: 'Australië',
  adelaide: 'Australië',
  // Zweden
  stockholm: 'Zweden', göteborg: 'Zweden', gothenburg: 'Zweden', malmö: 'Zweden',
  // Rusland
  moscow: 'Rusland', moskou: 'Rusland', 'st petersburg': 'Rusland',
  'sint petersburg': 'Rusland',
  // China
  beijing: 'China', shanghai: 'China', guangzhou: 'China', shenzhen: 'China',
  // Nigeria
  lagos: 'Nigeria', abuja: 'Nigeria',
};

/**
 * Detect country from city name
 */
export const detectCountryFromCity = (city: string): string | null => {
  if (!city) return null;
  const normalized = city.toLowerCase().trim();
  return cityToCountry[normalized] || null;
};

// Get the geographic region based on focus and optional city
const getCountryForFocus = (focus: string, city?: string): string[] => {
  // If city is provided, try to detect country and prioritize it
  const detectedCountry = city ? detectCountryFromCity(city) : null;
  
  const baseCountries = (() => {
    switch (focus) {
      case 'netherlands':
        return ['Nederland'];
      case 'europe':
        return ['Nederland', 'Duitsland', 'UK', 'Frankrijk', 'Italië', 'Zweden', 'Australië'];
      case 'world':
      default:
        return ['Nederland', 'USA', 'UK', 'Global', 'Japan', 'Zuid-Korea', 'Brazilië', 'Duitsland', 'Frankrijk'];
    }
  })();
  
  if (detectedCountry) {
    // Put detected country first, then add remaining countries
    const rest = baseCountries.filter(c => c !== detectedCountry);
    return [detectedCountry, ...rest];
  }
  
  return baseCountries;
};

export interface SubcultureResult {
  subcultures: string[];
  period: string;
  targetGroup: string;
  country: string;
}

/**
 * Get relevant subcultures based on user's selected period and birth year
 */
export const getSubculturesForPeriod = (
  startYear: number,
  endYear: number,
  periodType: string,
  focus: string = 'netherlands',
  city?: string
): SubcultureResult | null => {
  // Calculate the middle year of the period to determine the decade
  const middleYear = Math.round((startYear + endYear) / 2);
  const decade = getDecadeString(middleYear);
  
  // Get target group based on period type
  const targetGroup = periodToTargetGroup[periodType] || 'Pubers';
  
  // Get countries to search for based on geographic focus
  const countries = getCountryForFocus(focus);
  
  // Find matching entries - prioritize Netherlands first, then other countries
  for (const country of countries) {
    const match = subcultureData.find(entry => 
      entry.period === decade && 
      entry.targetGroup === targetGroup &&
      entry.country === country
    );
    
    if (match && match.subcultures.length > 0) {
      return {
        subcultures: match.subcultures,
        period: match.period,
        targetGroup: match.targetGroup,
        country: match.country
      };
    }
  }
  
  // Fallback: try to find any entry for this decade and target group
  const fallback = subcultureData.find(entry => 
    entry.period === decade && 
    entry.targetGroup === targetGroup
  );
  
  if (fallback) {
    return {
      subcultures: fallback.subcultures,
      period: fallback.period,
      targetGroup: fallback.targetGroup,
      country: fallback.country
    };
  }
  
  return null;
};

/**
 * Get all subcultures for a decade (for reference)
 */
export const getAllSubculturesForDecade = (decade: string): string[] => {
  const entries = subcultureData.filter(entry => entry.period === decade);
  const allSubcultures = new Set<string>();
  
  entries.forEach(entry => {
    entry.subcultures.forEach(sub => allSubcultures.add(sub));
  });
  
  return Array.from(allSubcultures);
};
