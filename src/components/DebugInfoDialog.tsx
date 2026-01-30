import { useState, useMemo } from 'react';
import { Bug, Music, Film, Search, Database, ExternalLink, Image, Filter, BarChart3, Tag, Clock, Star, User, Tv, Disc } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { TimelineEvent } from '@/types/timeline';

interface DebugInfoDialogProps {
  events: TimelineEvent[];
}

export function DebugInfoDialog({ events }: DebugInfoDialogProps) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');

  // Filter events based on search
  const filteredEvents = useMemo(() => {
    if (!filter.trim()) return events;
    const lowerFilter = filter.toLowerCase();
    return events.filter(e => 
      e.title.toLowerCase().includes(lowerFilter) ||
      e.category?.toLowerCase().includes(lowerFilter) ||
      e.visualSubjectType?.toLowerCase().includes(lowerFilter) ||
      e.imageSearchQuery?.toLowerCase().includes(lowerFilter) ||
      e.imageSearchQueryEn?.toLowerCase().includes(lowerFilter)
    );
  }, [events, filter]);

  // Statistics
  const stats = useMemo(() => {
    const total = events.length;
    const withImages = events.filter(e => e.imageUrl).length;
    const bySource: Record<string, number> = {};
    const byCategory: Record<string, number> = {};
    const byType: Record<string, number> = {};
    
    events.forEach(e => {
      // Count by source
      const source = getSourceType(e.source);
      bySource[source] = (bySource[source] || 0) + 1;
      
      // Count by category
      const cat = e.category || 'unknown';
      byCategory[cat] = (byCategory[cat] || 0) + 1;
      
      // Count by visual type
      const type = e.visualSubjectType || 'event';
      byType[type] = (byType[type] || 0) + 1;
    });

    return { total, withImages, bySource, byCategory, byType };
  }, [events]);

  // Determine the source type based on the source URL
  function getSourceType(source?: string): string {
    if (!source) return 'Geen';
    if (source.includes('themoviedb.org') || source.includes('tmdb')) return 'TMDB';
    if (source.includes('commons.wikimedia')) return 'Commons';
    if (source.includes('wikipedia.org')) {
      if (source.includes('nl.wikipedia')) return 'Wiki NL';
      if (source.includes('en.wikipedia')) return 'Wiki EN';
      if (source.includes('de.wikipedia')) return 'Wiki DE';
      return 'Wikipedia';
    }
    if (source.includes('nationaalarchief')) return 'Nat. Archief';
    return 'Onbekend';
  }

  // Determine which sources were searched based on visualSubjectType
  const getSearchedSources = (event: TimelineEvent): string[] => {
    const type = event.visualSubjectType;
    const sources: string[] = [];

    if (event.isMovie || type === 'movie') {
      sources.push('1. TMDB (Films)', '→ Fallback: Wiki NL/EN/DE, Commons');
    } else if (event.isCelebrityBirthday || type === 'person') {
      sources.push('1. TMDB (Personen)', '→ Fallback: Wiki NL');
    } else if (type === 'product' || type === 'logo' || type === 'artwork') {
      sources.push('1. Commons (SVG)', '2. Wiki EN');
    } else {
      if (event.category === 'local' || event.category === 'politics') {
        sources.push('1. Nat. Archief');
      }
      sources.push('→ Wiki NL/EN/DE, Commons');
    }

    return sources;
  };

  // Get importance color
  const getImportanceColor = (importance?: string) => {
    switch (importance) {
      case 'high': return 'bg-red-500/20 text-red-700 dark:text-red-300';
      case 'medium': return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300';
      case 'low': return 'bg-gray-500/20 text-gray-700 dark:text-gray-300';
      default: return 'bg-gray-500/20 text-gray-600 dark:text-gray-400';
    }
  };

  // Get event scope label
  const getScopeLabel = (scope?: string) => {
    switch (scope) {
      case 'birthdate': return 'Geboortedatum';
      case 'birthmonth': return 'Geboortemaand';
      case 'birthyear': return 'Geboortejaar';
      case 'period': return 'Periode';
      default: return scope || 'Onbekend';
    }
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
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bug className="h-5 w-5" />
            Debug Info: Zoekresultaten
          </DialogTitle>
        </DialogHeader>

        {/* Statistics panel */}
        <div className="bg-muted/50 rounded-lg p-3 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium">
            <BarChart3 className="h-4 w-4" />
            Statistieken
          </div>
          
          {/* Main stats */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-background rounded-md p-2">
              <div className="text-2xl font-bold text-foreground">{stats.total}</div>
              <div className="text-xs text-muted-foreground">Events</div>
            </div>
            <div className="bg-background rounded-md p-2">
              <div className="text-2xl font-bold text-emerald-600">{stats.withImages}</div>
              <div className="text-xs text-muted-foreground">Met afbeelding</div>
            </div>
            <div className="bg-background rounded-md p-2">
              <div className="text-2xl font-bold text-foreground">
                {stats.total > 0 ? Math.round((stats.withImages / stats.total) * 100) : 0}%
              </div>
              <div className="text-xs text-muted-foreground">Hit rate</div>
            </div>
          </div>

          {/* Source breakdown */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.bySource)
              .filter(([source]) => source !== 'Geen')
              .sort((a, b) => b[1] - a[1])
              .map(([source, count]) => (
                <span key={source} className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                  {source}: {count}
                </span>
              ))
            }
            {stats.bySource['Geen'] > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-700 dark:text-orange-300">
                Geen: {stats.bySource['Geen']}
              </span>
            )}
          </div>

          {/* Type breakdown */}
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(stats.byType)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => (
                <span key={type} className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-700 dark:text-purple-300">
                  {type}: {count}
                </span>
              ))
            }
          </div>
        </div>

        {/* Filter input */}
        <div className="relative">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter op titel, categorie, type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
          {filter && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {filteredEvents.length} / {events.length}
            </span>
          )}
        </div>
        
        <ScrollArea className="h-[50vh] pr-4">
          <div className="space-y-3">
            {filteredEvents.map((event, index) => (
              <div 
                key={event.id} 
                className="border rounded-lg p-3 text-sm space-y-2 bg-muted/30"
              >
                {/* Event header with thumbnail */}
                <div className="flex gap-3">
                  {/* Thumbnail */}
                  {event.imageUrl && (
                    <div className="shrink-0">
                      <img 
                        src={event.imageUrl} 
                        alt="" 
                        className="w-16 h-16 object-cover rounded-md bg-muted"
                        loading="lazy"
                      />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-xs text-muted-foreground font-mono">#{index + 1}</span>
                        <h4 className="font-medium text-foreground leading-tight truncate">{event.title}</h4>
                        <p className="text-xs text-muted-foreground">{event.date} ({event.year})</p>
                      </div>
                    </div>

                    {/* Tags row: category, importance, scope, flags */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      <span className="text-xs px-1.5 py-0.5 rounded bg-secondary text-secondary-foreground">
                        {event.category}
                      </span>
                      {event.importance && (
                        <span className={`text-xs px-1.5 py-0.5 rounded flex items-center gap-0.5 ${getImportanceColor(event.importance)}`}>
                          <Star className="h-2.5 w-2.5" />
                          {event.importance}
                        </span>
                      )}
                      {event.eventScope && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" />
                          {getScopeLabel(event.eventScope)}
                        </span>
                      )}
                      {event.isMovie && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-red-500/20 text-red-700 dark:text-red-300 flex items-center gap-0.5">
                          <Tv className="h-2.5 w-2.5" />
                          Film
                        </span>
                      )}
                      {event.isCelebrityBirthday && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-pink-500/20 text-pink-700 dark:text-pink-300 flex items-center gap-0.5">
                          <User className="h-2.5 w-2.5" />
                          Celeb
                        </span>
                      )}
                      {event.category === 'music' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-green-500/20 text-green-700 dark:text-green-300 flex items-center gap-0.5">
                          <Disc className="h-2.5 w-2.5" />
                          Music
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 text-xs border-t pt-2">
                  {/* Spotify search query */}
                  {event.spotifySearchQuery && (
                    <div className="flex items-start gap-2">
                      <Music className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground">Spotify:</span>
                        <p className="font-mono bg-background px-1.5 py-0.5 rounded mt-0.5 truncate">
                          {event.spotifySearchQuery}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* YouTube/Movie search query */}
                  {event.movieSearchQuery && (
                    <div className="flex items-start gap-2">
                      <Film className="h-3.5 w-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div className="min-w-0 flex-1">
                        <span className="text-muted-foreground">YouTube:</span>
                        <p className="font-mono bg-background px-1.5 py-0.5 rounded mt-0.5 truncate">
                          {event.movieSearchQuery}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Image search query */}
                  <div className="flex items-start gap-2">
                    <Search className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Image zoekopdracht:</span>
                      {event.imageSearchQuery ? (
                        <div className="space-y-1 mt-0.5">
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase shrink-0">NL:</span>
                            <span className="font-mono bg-background px-1.5 py-0.5 rounded truncate">
                              {event.imageSearchQuery}
                            </span>
                          </div>
                          {event.imageSearchQueryEn && event.imageSearchQueryEn !== event.imageSearchQuery && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-muted-foreground font-medium uppercase shrink-0">EN:</span>
                              <span className="font-mono bg-background px-1.5 py-0.5 rounded truncate">
                                {event.imageSearchQueryEn}
                              </span>
                            </div>
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
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Routing:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 font-medium">
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
                    <Image className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-muted-foreground">Resultaat:</span>
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
                              className="flex items-center gap-1 font-mono text-[10px] text-muted-foreground hover:text-foreground truncate mt-1"
                            >
                              <ExternalLink className="h-2.5 w-2.5 shrink-0" />
                              <span className="truncate">{event.source}</span>
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
