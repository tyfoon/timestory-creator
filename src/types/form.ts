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
};

export type FormData = {
  type: TimelineType;
  birthDate?: BirthDateData;
  yearRange?: YearRangeData;
  optionalData: OptionalData;
};
