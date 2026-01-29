import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SpotifyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

interface SpotifyTrack {
  id: string;
  name: string;
  artists: { name: string }[];
  album: { name: string; images: { url: string }[] };
  preview_url: string | null;
  external_urls: { spotify: string };
}

interface SpotifySearchResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || typeof query !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid 'query' parameter" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get Spotify credentials from environment
    const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID");
    const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET");

    if (!SPOTIFY_CLIENT_ID) {
      console.error("SPOTIFY_CLIENT_ID is not configured");
      return new Response(
        JSON.stringify({ error: "Spotify Client ID is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!SPOTIFY_CLIENT_SECRET) {
      console.error("SPOTIFY_CLIENT_SECRET is not configured");
      return new Response(
        JSON.stringify({ error: "Spotify Client Secret is not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Spotify Search] Searching for: "${query}"`);

    // Step A: Get access token using Client Credentials flow
    const credentials = btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`);
    
    const tokenResponse = await fetch("https://accounts.spotify.com/api/token", {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error(`[Spotify Auth] Failed to get access token: ${tokenResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Failed to authenticate with Spotify" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenData: SpotifyTokenResponse = await tokenResponse.json();
    console.log("[Spotify Auth] Successfully obtained access token");

    // Step B: Search for track
    const searchUrl = new URL("https://api.spotify.com/v1/search");
    searchUrl.searchParams.set("q", query);
    searchUrl.searchParams.set("type", "track");
    // Ask for multiple results so we can pick one that has a preview_url (for autoplay on the client)
    searchUrl.searchParams.set("limit", "10");
    // Market can influence availability of preview_url
    searchUrl.searchParams.set("market", "NL");

    const searchResponse = await fetch(searchUrl.toString(), {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${tokenData.access_token}`,
      },
    });

    if (!searchResponse.ok) {
      const errorText = await searchResponse.text();
      console.error(`[Spotify Search] Search failed: ${searchResponse.status} - ${errorText}`);
      return new Response(
        JSON.stringify({ error: "Spotify search failed" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const searchData: SpotifySearchResponse = await searchResponse.json();

    // Step C: Return the track ID (or null if no results)
    if (searchData.tracks.items.length === 0) {
      console.log(`[Spotify Search] No results found for: "${query}"`);
      return new Response(
        JSON.stringify({ trackId: null, message: "No tracks found" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const trackWithPreview = searchData.tracks.items.find((t) => !!t.preview_url);
    const track = trackWithPreview ?? searchData.tracks.items[0];

    if (!track.preview_url) {
      console.log(`[Spotify Search] Found track but preview_url is missing. Returning first result: "${track.name}" by ${track.artists.map(a => a.name).join(", ")}`);
    } else {
      console.log(`[Spotify Search] Found track with preview_url: "${track.name}" by ${track.artists.map(a => a.name).join(", ")}`);
    }

    return new Response(
      JSON.stringify({
        trackId: track.id,
        trackName: track.name,
        artistName: track.artists.map(a => a.name).join(", "),
        albumName: track.album.name,
        albumImage: track.album.images[0]?.url || null,
        previewUrl: track.preview_url,
        spotifyUrl: track.external_urls.spotify,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Spotify Search] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
