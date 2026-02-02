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

// Get the geographic region based on focus
const getCountryForFocus = (focus: string): string[] => {
  switch (focus) {
    case 'netherlands':
      return ['Nederland'];
    case 'europe':
      return ['Nederland', 'Duitsland', 'UK', 'Frankrijk', 'Italië', 'Zweden', 'Australië'];
    case 'world':
    default:
      return ['Nederland', 'USA', 'UK', 'Global', 'Japan', 'Zuid-Korea', 'Brazilië', 'Duitsland', 'Frankrijk'];
  }
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
  focus: string = 'netherlands'
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
