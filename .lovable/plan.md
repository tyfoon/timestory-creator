
# Plan: Dual Image Search Mode (Legacy vs Tol)

## Overview
Implement an alternative image search method using the DDG Image Search API at `https://ddg-image-search-bn3h8.ondigitalocean.app/`. Users can toggle between "Legacy" (current Wikipedia/TMDB based search) and "Tol" (new DDG-powered intelligent search) via a switch on the homepage.

## Key Benefits of Tol API
- Accepts loose search terms with built-in intelligence
- Works better with decade info (e.g., "Levis Jeans 80s")
- Single endpoint for all image types (no routing logic needed)
- Ranked results using resolution, aspect ratio, domain trust, and query relevance

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Homepage (Index.tsx)                      │
│                                                                  │
│   ┌──────────────────────────────────────────────────────────┐  │
│   │  Toggle: [Legacy] ←→ [Tol]                                │  │
│   └──────────────────────────────────────────────────────────┘  │
│                              │                                   │
│               Stored in sessionStorage                           │
│               Key: "imageSearchMode"                             │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              useClientImageSearch Hook                           │
│                                                                  │
│   reads sessionStorage.getItem("imageSearchMode")                │
│                                                                  │
│   if mode === "legacy"    →  searchSingleImage() (existing)      │
│   if mode === "tol"       →  searchSingleImageTol() (new)        │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Edge Function (new)                           │
│              supabase/functions/search-images-tol                │
│                                                                  │
│   - Receives: query, year, category                              │
│   - Builds search query with decade if year provided             │
│   - Calls DDG API with API key                                   │
│   - Returns: { imageUrl, source, score }                         │
└─────────────────────────────────────────────────────────────────┘
```

## Implementation Steps

### Step 1: Add DDG API Key Secret
- Use the secrets tool to request the `DDG_IMAGE_SEARCH_API_KEY` from the user
- This key authenticates requests to the DDG Image Search API

### Step 2: Create Edge Function `search-images-tol`
**File**: `supabase/functions/search-images-tol/index.ts`

The edge function will:
- Accept `query`, `year`, and `category` in the request body
- Build an optimized search query:
  - For years 1970-1979: append "70s"
  - For years 1980-1989: append "80s"
  - For years 1990-1999: append "90s"
  - For years 2000-2009: append "2000s"
  - etc.
- Call `GET /search?q={query}&key={apiKey}` on the DDG API
- Return the result or null if 404

```typescript
// Pseudocode
const decadeMap = {
  197: "70s", 198: "80s", 199: "90s", 
  200: "2000s", 201: "2010s", 202: "2020s"
};

const decade = year ? decadeMap[Math.floor(year / 10)] : null;
const searchQuery = decade ? `${query} ${decade}` : query;

const response = await fetch(
  `https://ddg-image-search-bn3h8.ondigitalocean.app/search?q=${encodeURIComponent(searchQuery)}&key=${apiKey}`
);
```

### Step 3: Create Client-Side Tol Search Function
**File**: `src/lib/api/tolImageSearch.ts`

New file that exports `searchSingleImageTol()`:
- Simplified logic compared to legacy (no routing, no TMDB, no Spotify)
- Calls the edge function
- Returns same `ImageResult` interface for compatibility
- Adds search trace entry for debugging

### Step 4: Update useClientImageSearch Hook
**File**: `src/hooks/useClientImageSearch.ts`

Modify the hook to:
- Read `imageSearchMode` from sessionStorage
- Import both `searchSingleImage` (legacy) and `searchSingleImageTol` (new)
- Route to the appropriate search function based on mode
- Keep all other logic (queue, concurrency, callbacks) the same

```typescript
const mode = sessionStorage.getItem('imageSearchMode') || 'legacy';
const searchFn = mode === 'tol' ? searchSingleImageTol : searchSingleImage;
```

### Step 5: Add Toggle Switch to Homepage
**File**: `src/pages/Index.tsx`

Add a simple toggle switch at the bottom of the form card:
- Uses the existing Switch component from shadcn/ui
- Labeled "Legacy" and "Tol"
- Persisted in sessionStorage
- Small, subtle styling (not prominent - this is for testing)

```tsx
<div className="flex items-center justify-between text-xs text-muted-foreground border-t pt-3">
  <span>Image Search Mode</span>
  <div className="flex items-center gap-2">
    <span>Legacy</span>
    <Switch checked={imageSearchMode === 'tol'} onCheckedChange={...} />
    <span>Tol</span>
  </div>
</div>
```

### Step 6: Update supabase/config.toml
Add the new edge function configuration:
```toml
[functions.search-images-tol]
verify_jwt = false
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `supabase/functions/search-images-tol/index.ts` | Create |
| `src/lib/api/tolImageSearch.ts` | Create |
| `src/hooks/useClientImageSearch.ts` | Modify |
| `src/pages/Index.tsx` | Modify |
| `supabase/config.toml` | Modify |

## Technical Details

### Query Building for Tol
The Tol API works best with decade information included. The edge function will:
1. Take the raw `imageSearchQuery` from the event
2. Append the decade suffix based on the event year
3. Keep the query loose (no special normalization needed - Tol handles this)

Example transformations:
- "Levis Jeans", year=1985 → "Levis Jeans 80s"
- "Walkman Sony", year=1982 → "Walkman Sony 80s"
- "iPhone", year=2007 → "iPhone 2000s"

### Backwards Compatibility
- Default mode is "legacy" (unchanged behavior)
- Both modes use the same `ImageResult` interface
- Cache system remains unchanged
- Blacklist system still works (DDG URLs can be blacklisted too)

### Search Trace Integration
The Tol search will add entries to the search trace for debugging:
```typescript
{ 
  source: '🔍 DDG/Tol', 
  query: 'Levis Jeans 80s', 
  withYear: true,
  result: 'found' | 'not_found' | 'error'
}
```

## Testing Approach
After implementation:
1. Set toggle to "Legacy" - verify existing behavior works
2. Set toggle to "Tol" - generate a new timeline
3. Compare image quality between the two modes
4. Check DebugInfoDialog to see search traces for both modes
