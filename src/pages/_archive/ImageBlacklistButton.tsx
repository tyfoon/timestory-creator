import { Ban } from 'lucide-react';
import { addToBlacklist } from '@/hooks/useImageBlacklist';

interface ImageBlacklistButtonProps {
  imageUrl: string;
  eventId: string;
  eventTitle?: string;
  searchQuery?: string;
  onBlacklist: (eventId: string) => void;
  className?: string;
}

/**
 * Small button overlay for blacklisting an image.
 * When clicked, adds the image to the global blacklist (database) and triggers a new search.
 * 
 * TEMPORARY: This feature is for development/testing only.
 * Remove before production release.
 */
export const ImageBlacklistButton = ({ 
  imageUrl, 
  eventId,
  eventTitle,
  searchQuery,
  onBlacklist,
  className = ''
}: ImageBlacklistButtonProps) => {
  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    // Add to global blacklist (database + local cache)
    await addToBlacklist(imageUrl, eventTitle, searchQuery);
    
    // Trigger re-search for this event
    onBlacklist(eventId);
  };

  return (
    <button
      onClick={handleClick}
      className={`
        absolute top-2 left-2 z-20
        w-7 h-7 rounded-full
        bg-black/60 hover:bg-destructive/90
        text-white/70 hover:text-white
        flex items-center justify-center
        transition-all duration-200
        opacity-0 group-hover:opacity-100
        backdrop-blur-sm
        ${className}
      `}
      title="Foto blacklisten (globaal) en nieuwe zoeken"
      aria-label="Blacklist afbeelding"
    >
      <Ban className="h-3.5 w-3.5" />
    </button>
  );
};
