import { TimelineEvent } from '@/types/timeline';
import { 
  Globe, 
  Trophy, 
  Music, 
  Tv, 
  Beaker, 
  Landmark, 
  MapPin, 
  Heart, 
  Cpu,
  Palette,
  Star,
  Cake,
  ImageOff
} from 'lucide-react';
import { useState } from 'react';

interface TimelineCardProps {
  event: TimelineEvent;
  isActive?: boolean;
  scopeLabel?: string | null;
}

const categoryIcons = {
  politics: Landmark,
  sports: Trophy,
  entertainment: Tv,
  science: Beaker,
  culture: Palette,
  world: Globe,
  local: MapPin,
  personal: Heart,
  music: Music,
  technology: Cpu,
  celebrity: Star,
};

const categoryColors = {
  politics: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  sports: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  entertainment: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  science: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300',
  culture: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  world: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  local: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
  personal: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300',
  music: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  technology: 'bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-300',
  celebrity: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
};

const categoryLabels = {
  politics: 'Politiek',
  sports: 'Sport',
  entertainment: 'Entertainment',
  science: 'Wetenschap',
  culture: 'Cultuur',
  world: 'Wereld',
  local: 'Lokaal',
  personal: 'Persoonlijk',
  music: 'Muziek',
  technology: 'Technologie',
  celebrity: 'Beroemdheid',
};

const scopeColors = {
  birthdate: 'bg-accent text-accent-foreground',
  birthmonth: 'bg-accent/70 text-accent-foreground',
  birthyear: 'bg-secondary text-secondary-foreground',
  period: 'bg-muted text-muted-foreground',
};

export const TimelineCard = ({ event, isActive, scopeLabel }: TimelineCardProps) => {
  const [imageError, setImageError] = useState(false);
  const Icon = categoryIcons[event.category] || Globe;
  const colorClass = categoryColors[event.category] || categoryColors.world;
  const label = categoryLabels[event.category] || event.category;

  const formatDate = () => {
    if (event.day && event.month) {
      return `${event.day}-${event.month}-${event.year}`;
    } else if (event.month) {
      const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
      return `${monthNames[event.month - 1]} ${event.year}`;
    }
    return event.year.toString();
  };

  // Generate a placeholder image based on category
  const getCategoryImage = () => {
    const categoryImages: Record<string, string> = {
      politics: `https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?w=600&h=400&fit=crop`,
      sports: `https://images.unsplash.com/photo-1461896836934-ffe607ba8211?w=600&h=400&fit=crop`,
      entertainment: `https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&h=400&fit=crop`,
      science: `https://images.unsplash.com/photo-1507413245164-6160d8298b31?w=600&h=400&fit=crop`,
      culture: `https://images.unsplash.com/photo-1518998053901-5348d3961a04?w=600&h=400&fit=crop`,
      world: `https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=600&h=400&fit=crop`,
      local: `https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=600&h=400&fit=crop`,
      music: `https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&h=400&fit=crop`,
      technology: `https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&h=400&fit=crop`,
      celebrity: `https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=600&h=400&fit=crop`,
    };
    return categoryImages[event.category] || categoryImages.world;
  };

  const displayImage = event.imageUrl && !imageError ? event.imageUrl : getCategoryImage();

  return (
    <article 
      className={`
        group relative bg-card rounded-xl border transition-all duration-300 h-full flex flex-col overflow-hidden
        ${isActive 
          ? 'border-accent shadow-elevated scale-[1.02]' 
          : 'border-border/50 shadow-card hover:shadow-elevated hover:border-border'
        }
        ${event.importance === 'high' ? 'ring-2 ring-accent/20' : ''}
      `}
    >
      {/* Image section - larger */}
      <div className="relative h-48 sm:h-56 overflow-hidden bg-muted flex-shrink-0">
        <img 
          src={displayImage} 
          alt={event.title}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          onError={() => setImageError(true)}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
        
        {/* Scope badge on image */}
        {scopeLabel && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${scopeColors[event.eventScope] || scopeColors.period}`}>
            {event.isCelebrityBirthday && <Cake className="inline h-3 w-3 mr-1" />}
            {scopeLabel}
          </div>
        )}
        
        {/* Category badge on image */}
        <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
          <Icon className="h-3 w-3" />
          {label}
        </div>
      </div>

      {/* Importance indicator */}
      {event.importance === 'high' && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-accent shadow-lg" />
      )}

      {/* Content section - flex grow */}
      <div className="p-4 sm:p-5 flex-1 flex flex-col">
        {/* Date */}
        <time className="text-sm font-medium text-accent font-mono mb-2">
          {formatDate()}
        </time>

        {/* Title */}
        <h3 className="font-serif text-lg sm:text-xl font-semibold text-foreground mb-3 leading-tight line-clamp-2">
          {event.title}
        </h3>

        {/* Description - more space */}
        <p className="text-muted-foreground text-sm sm:text-base leading-relaxed flex-1 line-clamp-4">
          {event.description}
        </p>

        {/* Source link if available */}
        {event.source && (
          <a 
            href={event.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-4 text-xs text-accent hover:underline"
            onClick={(e) => e.stopPropagation()}
          >
            Bron →
          </a>
        )}
      </div>
    </article>
  );
};
