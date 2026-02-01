import { useState } from 'react';
import { TimelineEvent } from '@/types/timeline';
import { Loader2, RotateCcw, Play, X, Ban } from 'lucide-react';
import { searchYouTube } from '@/lib/api/youtube';
import { SpotifyPlayer } from './SpotifyPlayer';
import { addToBlacklist } from '@/hooks/useImageBlacklist';

// Import category placeholder images
import placeholderBirthday from '@/assets/placeholders/birthday.jpg';
import placeholderFireworks from '@/assets/placeholders/fireworks.jpg';
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

import { Check } from 'lucide-react';

interface PolaroidCardProps {
  event: TimelineEvent;
  index: number;
  /** Selection mode for collage feature */
  isSelectingMode?: boolean;
  /** Whether this card is selected */
  isSelected?: boolean;
  /** Handler for selection toggle */
  onToggleSelection?: () => void;
  /** Callback when image is blacklisted - triggers re-search */
  onBlacklistImage?: (eventId: string) => void;
}

const monthNames = ['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];

// Map categories to placeholder images
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

// Get placeholder image based on event category and scope
const getPlaceholderImage = (event: TimelineEvent): string => {
  // For the "Welcome to the world" birth event, use colorful birthday image
  if (isWelcomeEvent(event)) {
    return placeholderBirthday;
  }
  
  // For other birthdate events without a specific image, use category fallback
  // Use category-specific placeholder
  return categoryPlaceholders[event.category] || placeholderWorld;
};

// Generate pseudo-random rotation based on event id for consistency
const getRotation = (id: string): number => {
  const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  // Range: -8 to +8 degrees (reduced for mobile)
  return ((hash % 16) - 8);
};

// Get neon accent color
const getAccentColor = (index: number): string => {
  const colors = [
    'text-polaroid-pink',
    'text-polaroid-cyan',
    'text-polaroid-yellow',
    'text-polaroid-purple',
    'text-polaroid-orange',
    'text-polaroid-mint',
  ];
  return colors[index % colors.length];
};

// Get background accent for back of card
const getBackAccent = (index: number): string => {
  const colors = [
    'from-polaroid-pink/20 to-transparent',
    'from-polaroid-cyan/20 to-transparent',
    'from-polaroid-yellow/20 to-transparent',
    'from-polaroid-purple/20 to-transparent',
    'from-polaroid-orange/20 to-transparent',
    'from-polaroid-mint/20 to-transparent',
  ];
  return colors[index % colors.length];
};

export const PolaroidCard = ({ 
  event, 
  index, 
  isSelectingMode = false,
  isSelected = false,
  onToggleSelection,
  onBlacklistImage,
}: PolaroidCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const rotation = getRotation(event.id);
  const accentColor = getAccentColor(index);
  const backAccent = getBackAccent(index);
  
  // YouTube trailer state
  const [isPlayingTrailer, setIsPlayingTrailer] = useState(false);
  const [isLoadingTrailer, setIsLoadingTrailer] = useState(false);
  const [youtubeVideoId, setYoutubeVideoId] = useState<string | null>(event.youtubeVideoId || null);
  
  // Handle YouTube trailer
  const handlePlayTrailer = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (youtubeVideoId) {
      setIsPlayingTrailer(true);
      return;
    }
    
    if (!event.movieSearchQuery) return;
    
    setIsLoadingTrailer(true);
    try {
      const result = await searchYouTube(event.movieSearchQuery);
      if (result.success && result.videoId) {
        setYoutubeVideoId(result.videoId);
        setIsPlayingTrailer(true);
      }
    } catch (err) {
      console.error('[PolaroidCard] YouTube error:', err);
    } finally {
      setIsLoadingTrailer(false);
    }
  };
  
  const handleStopTrailer = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPlayingTrailer(false);
  };
  
  // Check if this is the welcome/birth event - these ALWAYS use the birthday placeholder
  const isWelcome = isWelcomeEvent(event);
  
  // Determine which image to show
  // For welcome events, ALWAYS use birthday placeholder - ignore any searched images
  const shouldShowPlaceholder = isWelcome || (
    !event.imageUrl && (event.imageStatus === 'none' || event.imageStatus === 'error')
  );
  
  // For welcome events, always use placeholder regardless of imageUrl
  const displayImage = isWelcome 
    ? getPlaceholderImage(event) 
    : (event.imageUrl || (shouldShowPlaceholder ? getPlaceholderImage(event) : null));
  const isPlaceholder = isWelcome || (!event.imageUrl && displayImage);
  
  // Get month - if no month provided, generate a pseudo-random one based on event id for consistency
  const getMonthFromEvent = (): number => {
    if (event.month) return event.month;
    // Generate pseudo-random month (1-12) based on event id hash
    const hash = event.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return (hash % 12) + 1;
  };
  
  const month = getMonthFromEvent();
  const monthLabel = monthNames[month - 1];
  const dateDisplay = `${monthLabel} '${String(event.year).slice(-2)}`;

  const hasImage = event.imageStatus === 'found' && !!event.imageUrl;

  const handleClick = () => {
    // In selection mode, toggle selection instead of flipping
    if (isSelectingMode) {
      if (hasImage && onToggleSelection) {
        onToggleSelection();
      }
      return;
    }
    // Don't flip if trailer is playing
    if (isPlayingTrailer) return;
    setIsFlipped(!isFlipped);
  };

  return (
    <div 
      className={`polaroid-card group cursor-pointer relative ${
        isSelectingMode && !hasImage ? 'opacity-40 pointer-events-none' : ''
      }`}
      style={{
        transform: `rotate(${rotation}deg)`,
        perspective: '1000px',
      }}
      onClick={handleClick}
    >
      {/* Selection overlay */}
      {isSelectingMode && hasImage && (
        <div className={`absolute inset-0 z-30 rounded-lg transition-all duration-200 pointer-events-none ${
          isSelected 
            ? 'ring-4 ring-accent shadow-lg' 
            : 'ring-2 ring-white/30'
        }`}>
          {/* Checkbox indicator */}
          <div className={`absolute top-2 right-2 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-md ${
            isSelected 
              ? 'bg-accent text-accent-foreground' 
              : 'bg-black/50 text-white/70'
          }`}>
            {isSelected ? (
              <Check className="h-4 w-4" />
            ) : (
              <span className="text-xs font-medium">+</span>
            )}
          </div>
        </div>
      )}
      {/* 3D flip container */}
      <div 
        className="polaroid-flip-container"
        style={{
          transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
        }}
      >
        {/* Front side - Photo */}
        <div className="polaroid-front">
          <div className="polaroid-frame">
            {/* Top accent strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor.replace('text-', 'bg-')}`} />
            
            {/* Image container */}
            <div className="polaroid-image-container">
              {/* YouTube trailer playing */}
              {isPlayingTrailer && youtubeVideoId ? (
                <div className="relative w-full h-full">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}?autoplay=1&rel=0`}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${event.title} trailer`}
                  />
                  {/* Close button */}
                  <button
                    onClick={handleStopTrailer}
                    className="absolute top-1 right-1 z-20 p-1 bg-black/70 hover:bg-black/90 text-white rounded-full transition-colors"
                    aria-label="Stop trailer"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ) : displayImage ? (
                <div className="relative w-full h-full group/image">
                  <img 
                    src={displayImage} 
                    alt={event.title}
                    className={`w-full h-full object-cover object-top ${isPlaceholder ? 'opacity-80' : ''}`}
                  />
                  {/* Subtle overlay for placeholders to indicate it's not the real image */}
                  {isPlaceholder && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
                  )}
                  
                  {/* Blacklist button - only for real images, not placeholders */}
                  {!isPlaceholder && event.imageUrl && onBlacklistImage && !isSelectingMode && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (event.imageUrl) {
                          addToBlacklist(event.imageUrl);
                          onBlacklistImage(event.id);
                        }
                      }}
                      className="absolute top-1 left-1 z-20 w-6 h-6 rounded-full bg-black/60 hover:bg-destructive/90 text-white/70 hover:text-white flex items-center justify-center transition-all duration-200 opacity-0 group-hover/image:opacity-100 backdrop-blur-sm"
                      title="Foto blacklisten en nieuwe zoeken"
                      aria-label="Blacklist afbeelding"
                    >
                      <Ban className="h-3 w-3" />
                    </button>
                  )}
                  
                  {/* Play buttons container - bottom left - no width constraint, let content flow naturally */}
                  <div className="absolute bottom-1 left-1 z-10 flex flex-col gap-1" onClick={(e) => e.stopPropagation()}>
                    {/* Spotify Player */}
                    {event.spotifySearchQuery && !isPlayingTrailer && (
                      <SpotifyPlayer searchQuery={event.spotifySearchQuery} compact />
                    )}
                    
                    {/* YouTube Trailer button */}
                    {event.movieSearchQuery && !isPlayingTrailer && (
                      <button
                        onClick={handlePlayTrailer}
                        disabled={isLoadingTrailer}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground rounded-full text-[10px] font-medium transition-colors shadow-md disabled:opacity-50"
                        aria-label="Play trailer"
                      >
                        {isLoadingTrailer ? (
                          <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        ) : (
                          <Play className="h-2.5 w-2.5 fill-current" />
                        )}
                        <span className="hidden sm:inline">Trailer</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : event.imageStatus === 'loading' ? (
                <div className="w-full h-full flex items-center justify-center bg-polaroid-dark/50">
                  <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-polaroid-pink" />
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-polaroid-dark/50">
                  <span className="text-white/30 text-3xl sm:text-4xl">📷</span>
                </div>
              )}
              
              {/* Date stamp on image edge - smaller font (hide when trailer playing) */}
              {!isPlayingTrailer && (
                <div className="absolute bottom-1 right-1 sm:bottom-1.5 sm:right-1.5 flex items-center gap-1 bg-black/50 px-1.5 py-0.5 rounded">
                  <span className={`font-handwriting text-[10px] sm:text-xs font-bold drop-shadow-lg ${accentColor}`}>
                    {dateDisplay}
                  </span>
                </div>
              )}
            </div>
            
            {/* Caption area - fixed position below image */}
            <div className="pt-1.5 sm:pt-2 px-0.5">
              <p className="font-handwriting text-xs sm:text-sm leading-tight text-polaroid-dark line-clamp-2 text-center">
                {event.title}
              </p>
            </div>
            
            {/* Polaroid imperfections */}
            <div className="polaroid-scratches" />
            
            {/* Flip icon hint - positioned in caption area */}
            <div className="absolute bottom-0.5 right-1 text-polaroid-dark/30 group-hover:text-polaroid-dark/50 transition-colors">
              <RotateCcw className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </div>
          </div>
        </div>

        {/* Back side - Story */}
        <div className="polaroid-back">
          <div className={`polaroid-frame-back bg-gradient-to-br ${backAccent}`}>
            {/* Top accent strip */}
            <div className={`absolute top-0 left-0 right-0 h-1 ${accentColor.replace('text-', 'bg-')}`} />
            
            {/* Content - maximized space */}
            <div className="pt-1.5 pb-1.5 px-1.5 sm:pt-2 sm:pb-2 sm:px-2 h-full flex flex-col">
              {/* Title at the very top */}
              <h3 className="font-handwriting text-sm sm:text-base font-bold text-polaroid-dark leading-tight line-clamp-2 mb-1.5 sm:mb-2">
                {event.title}
              </h3>
              
              {/* Description - maximized scroll area */}
              <div className="flex-1 overflow-y-auto min-h-0 pr-0.5">
                <p className="text-xs sm:text-sm text-polaroid-dark/80 leading-relaxed">
                  {event.description}
                </p>
              </div>
              
              {/* Footer with category and flip icon - at the very bottom */}
              <div className="mt-1.5 pt-1.5 sm:mt-2 sm:pt-2 border-t border-polaroid-dark/10 flex items-center justify-between">
                <span className={`inline-block px-1.5 sm:px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-medium ${accentColor} bg-polaroid-dark/5`}>
                  {event.category}
                </span>
                <RotateCcw className="h-3 w-3 sm:h-4 sm:w-4 text-polaroid-dark/30" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
