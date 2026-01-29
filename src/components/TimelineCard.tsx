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
  Loader2,
  Play,
  X
} from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { SpotifyPlayer } from './SpotifyPlayer';
import { searchYouTube } from '@/lib/api/youtube';

// Import category placeholder images
import placeholderBirthday from '@/assets/placeholders/birthday.jpg';
import placeholderPolitics from '@/assets/placeholders/politics.jpg';
import placeholderSports from '@/assets/placeholders/sports.jpg';
import placeholderMusic from '@/assets/placeholders/music.jpg';
import placeholderEntertainment from '@/assets/placeholders/entertainment.jpg';
import placeholderScience from '@/assets/placeholders/science.jpg';
import placeholderCulture from '@/assets/placeholders/culture.jpg';
import placeholderWorld from '@/assets/placeholders/world.jpg';
import placeholderLocal from '@/assets/placeholders/local.jpg';
import placeholderTechnology from '@/assets/placeholders/technology.jpg';
import placeholderCelebrity from '@/assets/placeholders/celebrity.jpg';
import placeholderPersonal from '@/assets/placeholders/personal.jpg';

// Category to placeholder mapping
const categoryPlaceholders: Record<string, string> = {
  politics: placeholderPolitics,
  sports: placeholderSports,
  music: placeholderMusic,
  entertainment: placeholderEntertainment,
  science: placeholderScience,
  culture: placeholderCulture,
  world: placeholderWorld,
  local: placeholderLocal,
  technology: placeholderTechnology,
  celebrity: placeholderCelebrity,
  personal: placeholderPersonal,
};

// Check if this is the "Welcome to the world" / birth announcement event
const isWelcomeEvent = (event: TimelineEvent): boolean => {
  const titleLower = event.title.toLowerCase();
  return (
    titleLower.includes('welkom op de wereld') ||
    titleLower.includes('welcome to the world') ||
    titleLower.includes('geboren') ||
    titleLower.includes('geboorte') ||
    (event.category === 'personal' && event.eventScope === 'birthdate' && 
     (titleLower.includes('birth') || titleLower.includes('born')))
  );
};

// Get placeholder image based on event category and type
const getPlaceholderImage = (event: TimelineEvent): string => {
  // For the "Welcome to the world" birth event, use colorful birthday image
  if (isWelcomeEvent(event)) {
    return placeholderBirthday;
  }
  
  // Use category-specific placeholder
  return categoryPlaceholders[event.category] || placeholderWorld;
};

interface TimelineCardProps {
  event: TimelineEvent;
  isActive?: boolean;
  scopeLabel?: string | null;
  /** When false, we don't render an <img> yet to avoid starting network requests for off-screen cards. */
  shouldLoadImage?: boolean;
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

export const TimelineCard = ({ event, isActive, scopeLabel, shouldLoadImage = true }: TimelineCardProps) => {
  const [imageError, setImageError] = useState(false);
  // Track which URL we've attempted to load to prevent unnecessary resets
  const lastAttemptedUrl = useRef<string | undefined>(undefined);

  // YouTube trailer state
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(null);

  // Only reset error state when imageUrl actually changes to a NEW value
  useEffect(() => {
    if (event.imageUrl && event.imageUrl !== lastAttemptedUrl.current) {
      setImageError(false);
      lastAttemptedUrl.current = event.imageUrl;
    }
  }, [event.imageUrl]);

  // Handler for playing trailer
  const handlePlayTrailer = async () => {
    if (!event.movieSearchQuery) return;
    
    setIsLoadingTrailer(true);
    try {
      const result = await searchYouTube(event.movieSearchQuery);
      if (result.success && result.videoId) {
        setYoutubeVideoId(result.videoId);
        setIsPlayingTrailer(true);
      } else {
        console.warn('No YouTube video found for:', event.movieSearchQuery);
      }
    } catch (error) {
      console.error('Error fetching YouTube video:', error);
    } finally {
      setIsLoadingTrailer(false);
    }
  };

  // Handler for stopping trailer
  const handleStopTrailer = () => {
    setIsPlayingTrailer(false);
    setYoutubeVideoId(null);
  };

  const Icon = categoryIcons[event.category] || Globe;
  const colorClass = categoryColors[event.category] || categoryColors.world;
  const label = categoryLabels[event.category] || event.category;

  // Check if this is the welcome/birth event - these ALWAYS use the birthday placeholder
  const isWelcome = isWelcomeEvent(event);

  const buildWikimediaThumbSrcSet = (url: string) => {
    // If we received a Wikimedia thumb url like .../960px-Filename.jpg, derive other sizes.
    // This avoids shipping large images on small screens.
    const hasThumb = /\/thumb\//.test(url) && /\/\d+px-/.test(url);
    if (!hasThumb) return undefined;

    const make = (w: number) => url.replace(/\/\d+px-/, `/${w}px-`);
    return [
      `${make(480)} 480w`,
      `${make(640)} 640w`,
      `${make(960)} 960w`,
      `${make(1280)} 1280w`,
    ].join(', ');
  };

  const formatDate = () => {
    if (event.day && event.month) {
      return `${event.day}-${event.month}-${event.year}`;
    } else if (event.month) {
      const monthNames = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun', 'jul', 'aug', 'sep', 'okt', 'nov', 'dec'];
      return `${monthNames[event.month - 1]} ${event.year}`;
    }
    return event.year.toString();
  };

  // Determine image to display
  // For welcome events, ALWAYS use birthday placeholder - ignore any searched images
  const isImageFound = event.imageStatus ? event.imageStatus === 'found' : !!event.imageUrl;
  const hasRealImage = shouldLoadImage && isImageFound && !!event.imageUrl && !imageError && !isWelcome;
  const srcSet = event.imageUrl ? buildWikimediaThumbSrcSet(event.imageUrl) : undefined;
  const sizes = "(min-width: 1024px) 420px, (min-width: 640px) 380px, 320px";
  
  // Determine if we should show a placeholder
  // For welcome events, always show birthday placeholder (no image search needed)
  const shouldShowPlaceholder = shouldLoadImage && (
    isWelcome ||
    (!hasRealImage && (event.imageStatus === 'none' || event.imageStatus === 'error' || imageError))
  );
  const placeholderImage = shouldShowPlaceholder ? getPlaceholderImage(event) : null;
  
  // Determine display image (real or placeholder)
  const displayImage = hasRealImage ? event.imageUrl : placeholderImage;
  const isPlaceholder = !hasRealImage && !!placeholderImage;
  
  // Loading state - but NOT for welcome events (they always show placeholder)
  const isLoading = shouldLoadImage && !isWelcome && event.imageStatus === 'loading' && !hasRealImage && !shouldShowPlaceholder;

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
      {/* Image section - real images or category-based placeholders */}
      <div className="relative h-64 sm:h-80 lg:h-96 overflow-hidden bg-muted flex-shrink-0">
        {/* YouTube Trailer Player */}
        {isPlayingTrailer && youtubeVideoId ? (
          <>
            <iframe
              src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
              title={`${event.title} trailer`}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            {/* Close button */}
            <button
              onClick={handleStopTrailer}
              className="absolute top-3 right-3 z-20 p-2 rounded-full bg-black/70 text-white hover:bg-black/90 transition-colors"
              aria-label="Trailer sluiten"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <>
            {displayImage ? (
              <>
                <img 
                  src={displayImage}
                  srcSet={!isPlaceholder ? srcSet : undefined}
                  sizes={!isPlaceholder && srcSet ? sizes : undefined}
                  alt={event.title}
                  className={`w-full h-full object-cover object-top transition-transform duration-300 group-hover:scale-105 ${isPlaceholder ? 'opacity-70' : ''}`}
                  onError={() => setImageError(true)}
                  loading={isActive ? "eager" : "lazy"}
                  decoding="async"
                  fetchPriority={isActive ? "high" : "low"}
                />
                {/* Overlay for placeholders to make them more subtle */}
                {isPlaceholder && (
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-card/60" />
                )}
              </>
            ) : isLoading ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-muted to-secondary/30">
                <Loader2 className="h-8 w-8 text-muted-foreground/40 animate-spin" />
                <span className="text-xs text-muted-foreground/50">Foto zoeken...</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted to-secondary/30">
                <span className="text-xs text-muted-foreground/40">
                  {!shouldLoadImage ? 'Scroll om foto te laden' : ''}
                </span>
              </div>
            )}
            
            {/* Play Trailer Button - positioned bottom-left, matching Spotify style */}
            {event.movieSearchQuery && !isPlayingTrailer && (
              <div className="absolute bottom-3 left-3 z-10">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlayTrailer();
                  }}
                  disabled={isLoadingTrailer}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-full text-xs font-medium transition-colors shadow-md"
                  aria-label="Trailer afspelen"
                >
                  {isLoadingTrailer ? (
                    <>
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Laden...</span>
                    </>
                  ) : (
                    <>
                      <Play className="h-3 w-3 fill-current" />
                      <span>Play Trailer</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </>
        )}
        
        <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent pointer-events-none" />
        
        {/* Scope badge on image */}
        {scopeLabel && !isPlayingTrailer && (
          <div className={`absolute top-3 left-3 px-2.5 py-1 rounded-full text-xs font-medium ${scopeColors[event.eventScope] || scopeColors.period}`}>
            {event.isCelebrityBirthday && <Cake className="inline h-3 w-3 mr-1" />}
            {scopeLabel}
          </div>
        )}
        
        {/* Category badge on image */}
        {!isPlayingTrailer && (
          <div className={`absolute top-3 right-3 inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${colorClass}`}>
            <Icon className="h-3 w-3" />
            {label}
          </div>
        )}
        
        {/* Spotify Player positioned bottom-left on image */}
        {event.spotifySearchQuery && !isPlayingTrailer && (
          <div className="absolute bottom-3 left-3 z-10">
            <SpotifyPlayer searchQuery={event.spotifySearchQuery} compact />
          </div>
        )}
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
