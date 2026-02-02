import { TimelineEvent } from '@/types/timeline';

// Import placeholders
import birthdayPlaceholder from '@/assets/placeholders/birthday.jpg';
import politicsPlaceholder from '@/assets/placeholders/politics.jpg';
import sportsPlaceholder from '@/assets/placeholders/sports.jpg';
import entertainmentPlaceholder from '@/assets/placeholders/entertainment.jpg';
import sciencePlaceholder from '@/assets/placeholders/science.jpg';
import culturePlaceholder from '@/assets/placeholders/culture.jpg';
import worldPlaceholder from '@/assets/placeholders/world.jpg';
import localPlaceholder from '@/assets/placeholders/local.jpg';
import musicPlaceholder from '@/assets/placeholders/music.jpg';
import technologyPlaceholder from '@/assets/placeholders/technology.jpg';
import celebrityPlaceholder from '@/assets/placeholders/celebrity.jpg';

export const getCategoryPlaceholder = (category: TimelineEvent['category']): string => {
  const placeholders: Record<TimelineEvent['category'], string> = {
    politics: politicsPlaceholder,
    sports: sportsPlaceholder,
    entertainment: entertainmentPlaceholder,
    science: sciencePlaceholder,
    culture: culturePlaceholder,
    world: worldPlaceholder,
    local: localPlaceholder,
    personal: birthdayPlaceholder,
    music: musicPlaceholder,
    technology: technologyPlaceholder,
    celebrity: celebrityPlaceholder,
  };
  return placeholders[category] || culturePlaceholder;
};

export const getEventImageUrl = (event: TimelineEvent): string => {
  if (event.imageUrl) return event.imageUrl;
  return getCategoryPlaceholder(event.category);
};
