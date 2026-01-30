import { useState } from 'react';
import { Bug, Music, Film, Search, Database, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { TimelineEvent } from '@/types/timeline';

interface DebugInfoDialogProps {
  events: TimelineEvent[];
}

export function DebugInfoDialog({ events }: DebugInfoDialogProps) {
  const [open, setOpen] = useState(false);

  // Determine the source type based on the source URL
  const getSourceType = (source?: string): string => {
    if (!source) return 'Geen';
    if (source.includes('themoviedb.org') || source.includes('tmdb')) return 'TMDB';
    if (source.includes('commons.wikimedia')) return 'Wikimedia Commons';
    if (source.includes('wikipedia.org')) {
      if (source.includes('nl.wikipedia')) return 'Wikipedia NL';
      if (source.includes('en.wikipedia')) return 'Wikipedia EN';
      if (source.includes('de.wikipedia')) return 'Wikipedia DE';
      return 'Wikipedia';
    }
    if (source.includes('nationaalarchief')) return 'Nationaal Archief';
    return 'Onbekend';
  };

  // Determine which sources were searched based on visualSubjectType
  const getSearchedSources = (event: TimelineEvent): string[] => {
    const type = event.visualSubjectType;
    const sources: string[] = [];

    if (event.isMovie || type === 'movie') {
      sources.push('TMDB (Films)');
    } else if (event.isCelebrityBirthday || type === 'person') {
      sources.push('TMDB (Personen)', 'Wikipedia NL');
    } else if (type === 'product' || type === 'logo' || type === 'artwork') {
      sources.push('Wikimedia Commons', 'Wikipedia EN');
    } else {
      // Default event routing
      if (event.category === 'local' || event.category === 'politics') {
        sources.push('Nationaal Archief');
      }
      sources.push('Wikipedia NL', 'Wikipedia EN', 'Wikimedia Commons');
    }

    return sources;
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
          title="Debug info"
        >
          <Bug className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Info: Zoekresultaten
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="h-[60vh] pr-4">
          <div className="space-y-4">
            {events.map((event, index) => (
              <div 
                key={event.id} 
                className="border rounded-lg p-3 text-sm space-y-2 bg-muted/30"
              >
                {/* Event header */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                    <h4 className="font-medium text-foreground leading-tight">{event.title}</h4>
                    <p className="text-xs text-muted-foreground">{event.date}</p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded bg-secondary text-secondary-foreground">
                    {event.category}
                  </span>
                </div>

                <div className="grid gap-2 text-xs">
                  {/* Spotify search query */}
                  {event.spotifySearchQuery && (
                    <div className="flex items-start gap-2">
                      <Music className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">Spotify zoekopdracht:</span>
                        <p className="font-mono bg-background px-1.5 py-0.5 rounded mt-0.5">
                          {event.spotifySearchQuery}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* YouTube/Movie search query */}
                  {event.movieSearchQuery && (
                    <div className="flex items-start gap-2">
                      <Film className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <span className="text-muted-foreground">YouTube zoekopdracht:</span>
                        <p className="font-mono bg-background px-1.5 py-0.5 rounded mt-0.5">
                          {event.movieSearchQuery}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Image search query */}
                  <div className="flex items-start gap-2">
                    <Search className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Image zoekopdracht:</span>
                      {event.imageSearchQuery ? (
                        <div className="space-y-1 mt-0.5">
                          <p className="font-mono bg-background px-1.5 py-0.5 rounded">
                            NL: {event.imageSearchQuery}
                          </p>
                          {event.imageSearchQueryEn && event.imageSearchQueryEn !== event.imageSearchQuery && (
                            <p className="font-mono bg-background px-1.5 py-0.5 rounded">
                              EN: {event.imageSearchQueryEn}
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic mt-0.5">Geen zoekopdracht</p>
                      )}
                    </div>
                  </div>

                  {/* Visual subject type & searched sources */}
                  <div className="flex items-start gap-2">
                    <Database className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Type & Gezochte bronnen:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                          {event.visualSubjectType || 'event'}
                        </span>
                        {getSearchedSources(event).map((src, i) => (
                          <span key={i} className="px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                            {src}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Found source */}
                  <div className="flex items-start gap-2">
                    <ExternalLink className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <span className="text-muted-foreground">Gevonden in:</span>
                      {event.imageUrl ? (
                        <div className="mt-0.5">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                            ✓ {getSourceType(event.source)}
                          </span>
                          {event.source && (
                            <a 
                              href={event.source} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="block font-mono text-[10px] text-muted-foreground hover:text-foreground truncate mt-1"
                            >
                              {event.source}
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="text-orange-500 mt-0.5">✗ Geen afbeelding gevonden</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
