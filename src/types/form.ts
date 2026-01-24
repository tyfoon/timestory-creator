export type TimelineType = 'birthdate' | 'range';

export type GeographicFocus = 'netherlands' | 'europe' | 'world';

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
  city?: string;
  children: ChildData[];
  partnerName?: string;
  partnerBirthDate?: BirthDateData;
  interests?: string;
  focus: GeographicFocus;
};

export type FormData = {
  type: TimelineType;
  birthDate?: BirthDateData;
  yearRange?: YearRangeData;
  optionalData: OptionalData;
};
