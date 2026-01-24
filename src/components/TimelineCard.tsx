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
  Palette
} from 'lucide-react';

interface TimelineCardProps {
  event: TimelineEvent;
  isActive?: boolean;
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
};

export const TimelineCard = ({ event, isActive }: TimelineCardProps) => {
  const Icon = categoryIcons[event.category] || Globe;
  const colorClass = categoryColors[event.category] || categoryColors.world;
  const label = categoryLabels[event.category] || event.category;

  const formatDate = () => {
    if (event.day && event.month) {
      return `${event.day}-${event.month}-${event.year}`;
    } else if (event.month) {
      return `${event.month}-${event.year}`;
    }
    return event.year.toString();
  };

  return (
    <article 
      className={`
        group relative bg-card rounded-xl border transition-all duration-300
        ${isActive 
          ? 'border-accent shadow-elevated scale-[1.02]' 
          : 'border-border/50 shadow-card hover:shadow-elevated hover:border-border'
        }
        ${event.importance === 'high' ? 'ring-2 ring-accent/20' : ''}
      `}
    >
      {/* Importance indicator */}
      {event.importance === 'high' && (
        <div className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-accent shadow-lg" />
      )}

      <div className="p-6">
        {/* Header with date and category */}
        <div className="flex items-center justify-between mb-4">
          <time className="text-sm font-medium text-muted-foreground font-mono">
            {formatDate()}
          </time>
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            <Icon className="h-3 w-3" />
            {label}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-serif text-lg font-semibold text-foreground mb-2 leading-tight">
          {event.title}
        </h3>

        {/* Description */}
        <p className="text-muted-foreground leading-relaxed text-sm">
          {event.description}
        </p>

        {/* Source link if available */}
        {event.source && (
          <a 
            href={event.source}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-xs text-accent hover:underline"
          >
            Bron →
          </a>
        )}
      </div>

      {/* Timeline connector line */}
      <div className="absolute left-1/2 -bottom-6 w-px h-6 bg-gradient-to-b from-border to-transparent hidden last:hidden" />
    </article>
  );
};
