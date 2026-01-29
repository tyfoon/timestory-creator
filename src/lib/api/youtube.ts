import { supabase } from "@/integrations/supabase/client";

export interface YouTubeSearchResult {
  success: boolean;
  videoId?: string | null;
  title?: string;
  thumbnail?: string;
  error?: string;
}

/**
 * Search YouTube for a video (typically a movie trailer)
 */
export async function searchYouTube(query: string): Promise<YouTubeSearchResult> {
  try {
    const { data, error } = await supabase.functions.invoke<YouTubeSearchResult>("search-youtube", {
      body: { query },
    });

    if (error) {
      console.error("Error calling search-youtube function:", error);
      return { success: false, error: error.message };
    }

    return data || { success: false, error: "No data returned" };
  } catch (err) {
    console.error("Error searching YouTube:", err);
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
  }
}
