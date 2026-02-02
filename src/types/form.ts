export type TimelineType = 'birthdate' | 'range';

export type GeographicFocus = 'netherlands' | 'europe' | 'world';

export type Gender = 'male' | 'female' | 'none';

export type Attitude = 'conservative' | 'neutral' | 'progressive';

export type PeriodType = 'birthyear' | 'childhood' | 'puberty' | 'young-adult' | 'custom';

export type BirthDateData = {
  day: number;
  month: number;
  year: number;
};

export type YearRangeData = {
  startYear: number;
  endYear: number;
};

export type ChildData = {
  name: string;
  birthDate?: BirthDateData;
};

// Subculture selection data
export type SubcultureData = {
  myGroup: string | null;           // Selected subculture (or null for neutral)
  otherGroupsFromEra: string;       // All other available options as comma-separated string
  availableOptions: string[];       // The 5 subcultures available for this era
};

export type OptionalData = {
  firstName?: string;
  lastName?: string;
  city?: string;
  gender: Gender;
  attitude: Attitude;
  children: ChildData[];
  partnerName?: string;
  partnerBirthDate?: BirthDateData;
  interests?: string;
  focus: GeographicFocus;
  periodType?: PeriodType;
  subculture?: SubcultureData;      // New: replaces attitude for prompt generation
  // Personal music video fields
  friends?: string;                 // Top 3 friends from back then (comma-separated)
  school?: string;                  // High school name
  nightlife?: string;               // Favorite clubs/bars (comma-separated)
};

export type FormData = {
  type: TimelineType;
  birthDate?: BirthDateData;
  yearRange?: YearRangeData;
  optionalData: OptionalData;
};
