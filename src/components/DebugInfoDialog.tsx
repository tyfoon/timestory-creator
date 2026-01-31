import { useState, useMemo } from 'react';
import { Bug, Music, Film, Search, Database, ExternalLink, Image, Filter, Clock, Star, User, Tv, Disc, CheckCircle2, XCircle, Timer, RefreshCw } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { TimelineEvent, SearchTraceEntry } from '@/types/timeline';

interface DebugInfoDialogProps {
  events: TimelineEvent[];
  onRefreshImages?: () => void;
  isRefreshing?: boolean;
}

export function DebugInfoDialog({ events, onRefreshImages, isRefreshing }: DebugInfoDialogProps) {
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
  function getSourceType(source?: string, imageUrl?: string): string {
    if (!source) return 'Geen';
    
    // Check if it's an SVG from the image URL
    const isSvg = imageUrl?.toLowerCase().includes('.svg');
    const svgSuffix = isSvg ? ' (SVG)' : '';
    
    // Spotify album art
    if (source.includes('spotify.com') || source.includes('open.spotify')) return '🎵 Spotify';
    if (source.includes('themoviedb.org') || source.includes('tmdb')) return 'TMDB';
    if (source.includes('commons.wikimedia')) return `Wikimedia Commons${svgSuffix}`;
    if (source.includes('wikipedia.org')) {
      if (source.includes('nl.wikipedia')) return `Wikipedia NL${svgSuffix}`;
      if (source.includes('en.wikipedia')) return `Wikipedia EN${svgSuffix}`;
      if (source.includes('de.wikipedia')) return `Wikipedia DE${svgSuffix}`;
      return `Wikipedia${svgSuffix}`;
    }
    if (source.includes('nationaalarchief')) return 'Nationaal Archief';
    return 'Onbekend';
  }

  // Determine which sources were searched based on visualSubjectType
  const getSearchedSources = (event: TimelineEvent): string[] => {
    const type = event.visualSubjectType;
    const sources: string[] = [];
    const isMusic = event.category === 'music' || !!event.spotifySearchQuery;

    // Muziek-events: Spotify eerst!
    if (isMusic && event.spotifySearchQuery) {
      sources.push('1. 🎵 Spotify Album Art');
      sources.push('→ Fallback: Wiki/Commons');
      return sources;
    }

    if (event.isMovie || type === 'movie') {
      sources.push('1. TMDB (Films)', '→ Wiki NL/EN/DE, Commons');
    } else if (event.isCelebrityBirthday || type === 'person') {
      sources.push('1. TMDB', '2. Commons', '3. Wiki EN/NL');
    } else if (type === 'product' || type === 'logo' || type === 'artwork' || type === 'lifestyle') {
      sources.push('1. Commons', '2. Wiki EN/NL');
    } else {
      // Events, locations, etc.
      if (event.category === 'local' || event.category === 'politics') {
        sources.push('1. Nat. Archief');
      }
      sources.push('1. Commons (+jaar)', '2. Wiki EN/NL (+jaar)', '3. Commons/Wiki (zonder jaar)');
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col" aria-describedby={undefined}>
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center justify-between text-base">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4" />
              Debug Info
              <span className="text-muted-foreground font-normal">
                — {stats.total} events, {stats.withImages} met beeld ({stats.total > 0 ? Math.round((stats.withImages / stats.total) * 100) : 0}%)
              </span>
            </div>
            {onRefreshImages && (
              <Button
                variant="outline"
                size="sm"
                onClick={onRefreshImages}
                disabled={isRefreshing}
                className="gap-1.5 text-xs h-7"
              >
                <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                {isRefreshing ? 'Zoeken...' : 'Herlaad alle afbeeldingen'}
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        {/* Compact stats row */}
        <div className="shrink-0 flex flex-wrap gap-1 text-[10px] pb-2 border-b">
          {Object.entries(stats.bySource)
            .filter(([source]) => source !== 'Geen')
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => (
              <span key={source} className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-300">
                {source}: {count}
              </span>
            ))
          }
          {stats.bySource['Geen'] > 0 && (
            <span className="px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-700 dark:text-orange-300">
              Geen: {stats.bySource['Geen']}
            </span>
          )}
          <span className="w-px bg-border mx-1" />
          {Object.entries(stats.byType)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <span key={type} className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300">
                {type}: {count}
              </span>
            ))
          }
        </div>

        {/* Filter input */}
        <div className="shrink-0 relative py-2">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Filter op titel, categorie, type..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9 h-9"
          />
          {filter && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              {filteredEvents.length} / {events.length}
            </span>
          )}
        </div>
        
        <div className="flex-1 min-h-0 overflow-y-auto pr-4">
          <div className="space-y-3 pb-4">
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
                            ✓ {getSourceType(event.source, event.imageUrl)}
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

                  {/* NEW: Detailed Search Trace */}
                  {event.searchTrace && event.searchTrace.length > 0 && (
                    <div className="flex items-start gap-2 border-t pt-2 mt-2">
                      <Timer className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <span className="text-muted-foreground font-medium">Zoeklogboek:</span>
                        <div className="mt-1.5 space-y-1">
                          {event.searchTrace.map((trace, i) => (
                            <div 
                              key={i} 
                              className={`flex items-start gap-2 text-[11px] px-2 py-1 rounded ${
                                trace.result === 'found' 
                                  ? 'bg-emerald-500/10 border border-emerald-500/30' 
                                  : 'bg-muted/50'
                              }`}
                            >
                              <span className="shrink-0 mt-0.5">
                                {trace.result === 'found' ? (
                                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                ) : trace.result === 'error' ? (
                                  <XCircle className="h-3 w-3 text-red-500" />
                                ) : (
                                  <XCircle className="h-3 w-3 text-muted-foreground/50" />
                                )}
                              </span>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className={`font-medium ${trace.result === 'found' ? 'text-emerald-700 dark:text-emerald-300' : 'text-muted-foreground'}`}>
                                    {trace.source}
                                  </span>
                                  {trace.withYear && (
                                    <span className="px-1 py-0.5 rounded bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[9px]">
                                      +jaar
                                    </span>
                                  )}
                                  <span className="text-muted-foreground/70 text-[9px]">
                                    {trace.timestamp}ms
                                  </span>
                                </div>
                                <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
                                  "{trace.query}"
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
