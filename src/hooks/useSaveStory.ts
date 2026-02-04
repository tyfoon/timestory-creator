import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VideoEvent } from '@/remotion/types';

export interface StoryContent {
  events: VideoEvent[];
  storyTitle?: string;
  storyIntroduction?: string;
  summary?: string;
}

export interface StorySettings {
  variant: 'slideshow' | 'scrapbook';
  fps: number;
  enableVhsEffect: boolean;
  retroIntensity: number;
  voiceProvider: 'google' | 'elevenlabs';
  // For music video mode
  isMusicVideo: boolean;
  backgroundMusicUrl?: string;
  backgroundMusicDuration?: number;
  // Intro
  introAudioUrl?: string;
  introDurationFrames?: number;
}

export interface SaveStoryResult {
  success: boolean;
  storyId?: string;
  shareUrl?: string;
  error?: string;
}

interface UseSaveStoryReturn {
  saveStory: (content: StoryContent, settings: StorySettings) => Promise<SaveStoryResult>;
  isSaving: boolean;
  progress: number;
  progressMessage: string;
}

/**
 * Converts a data URL or blob URL to a Blob
 */
const urlToBlob = async (url: string): Promise<Blob | null> => {
  try {
    // Data URL (base64)
    if (url.startsWith('data:')) {
      const response = await fetch(url);
      return response.blob();
    }
    
    // Blob URL
    if (url.startsWith('blob:')) {
      const response = await fetch(url);
      return response.blob();
    }
    
    // Already a permanent URL - no conversion needed
    return null;
  } catch (error) {
    console.error('Failed to convert URL to blob:', error);
    return null;
  }
};

/**
 * Generates a unique filename for storage
 */
const generateFilename = (prefix: string, extension: string = 'mp3'): string => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}.${extension}`;
};

/**
 * Hook for saving stories with their audio assets to Supabase
 */
export const useSaveStory = (): UseSaveStoryReturn => {
  const [isSaving, setIsSaving] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  const saveStory = useCallback(async (
    content: StoryContent,
    settings: StorySettings
  ): Promise<SaveStoryResult> => {
    setIsSaving(true);
    setProgress(0);
    setProgressMessage('Voorbereiden...');

    try {
      const { events, storyTitle, storyIntroduction, summary } = content;
      
      // Clone events so we can modify URLs
      const processedEvents: VideoEvent[] = JSON.parse(JSON.stringify(events));
      
      // Count how many audio files we need to upload
      let audioFilesToUpload = 0;
      
      // Check intro audio
      const hasIntroAudio = settings.introAudioUrl && 
        (settings.introAudioUrl.startsWith('data:') || settings.introAudioUrl.startsWith('blob:'));
      if (hasIntroAudio) audioFilesToUpload++;
      
      // Check background music (Suno)
      const hasBackgroundMusic = settings.backgroundMusicUrl && 
        (settings.backgroundMusicUrl.startsWith('data:') || settings.backgroundMusicUrl.startsWith('blob:'));
      if (hasBackgroundMusic) audioFilesToUpload++;
      
      // Check each event's audio
      for (const event of processedEvents) {
        if (event.audioUrl && (event.audioUrl.startsWith('data:') || event.audioUrl.startsWith('blob:'))) {
          audioFilesToUpload++;
        }
        if (event.soundEffectAudioUrl && (event.soundEffectAudioUrl.startsWith('data:') || event.soundEffectAudioUrl.startsWith('blob:'))) {
          audioFilesToUpload++;
        }
      }

      let uploadedCount = 0;
      const updateProgress = () => {
        if (audioFilesToUpload > 0) {
          const pct = Math.round((uploadedCount / audioFilesToUpload) * 80);
          setProgress(pct);
        }
      };

      // Upload helper function
      const uploadAudio = async (url: string, prefix: string): Promise<string | null> => {
        const blob = await urlToBlob(url);
        if (!blob) return url; // Already a permanent URL
        
        const filename = generateFilename(prefix);
        const { data, error } = await supabase.storage
          .from('story-assets')
          .upload(filename, blob, {
            contentType: blob.type || 'audio/mpeg',
            cacheControl: '31536000', // 1 year cache
          });

        if (error) {
          console.error('Upload error:', error);
          throw new Error(`Upload mislukt: ${error.message}`);
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from('story-assets')
          .getPublicUrl(data.path);

        uploadedCount++;
        updateProgress();
        return urlData.publicUrl;
      };

      // 1. Upload intro audio if needed
      let finalIntroAudioUrl = settings.introAudioUrl;
      if (hasIntroAudio && settings.introAudioUrl) {
        setProgressMessage('Intro audio uploaden...');
        finalIntroAudioUrl = await uploadAudio(settings.introAudioUrl, 'intro') || undefined;
      }

      // 2. Upload background music if needed
      let finalBackgroundMusicUrl = settings.backgroundMusicUrl;
      if (hasBackgroundMusic && settings.backgroundMusicUrl) {
        setProgressMessage('Achtergrondmuziek uploaden...');
        finalBackgroundMusicUrl = await uploadAudio(settings.backgroundMusicUrl, 'music') || undefined;
      }

      // 3. Upload event audio files
      for (let i = 0; i < processedEvents.length; i++) {
        const event = processedEvents[i];
        
        // Upload voiceover
        if (event.audioUrl && (event.audioUrl.startsWith('data:') || event.audioUrl.startsWith('blob:'))) {
          setProgressMessage(`Audio uploaden (${i + 1}/${processedEvents.length})...`);
          const permanentUrl = await uploadAudio(event.audioUrl, `voice_${event.id}`);
          if (permanentUrl) {
            processedEvents[i] = { ...event, audioUrl: permanentUrl };
          }
        }
        
        // Upload sound effect
        if (event.soundEffectAudioUrl && (event.soundEffectAudioUrl.startsWith('data:') || event.soundEffectAudioUrl.startsWith('blob:'))) {
          setProgressMessage(`Geluidseffect uploaden (${i + 1}/${processedEvents.length})...`);
          const permanentUrl = await uploadAudio(event.soundEffectAudioUrl, `sfx_${event.id}`);
          if (permanentUrl) {
            processedEvents[i] = { ...processedEvents[i], soundEffectAudioUrl: permanentUrl };
          }
        }
      }

      setProgress(85);
      setProgressMessage('Verhaal opslaan...');

      // 4. Prepare the final content and settings objects
      const finalContent: StoryContent = {
        events: processedEvents,
        storyTitle,
        storyIntroduction,
        summary,
      };

      const finalSettings: StorySettings = {
        ...settings,
        introAudioUrl: finalIntroAudioUrl,
        backgroundMusicUrl: finalBackgroundMusicUrl,
      };

      // 5. Insert into database
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: insertData, error: insertError } = await supabase
        .from('saved_stories')
        .insert({
          content: finalContent as any,
          settings: finalSettings as any,
          is_public: true,
        })
        .select('id')
        .single();

      if (insertError) {
        console.error('Database insert error:', insertError);
        throw new Error(`Opslaan mislukt: ${insertError.message}`);
      }

      setProgress(100);
      setProgressMessage('Klaar!');

      // Generate share URL - use published URL for branded links
      const storyId = insertData.id;
      const publishedUrl = 'https://timestory-creator.lovable.app';
      const shareUrl = `${publishedUrl}/s/${storyId}`;

      return {
        success: true,
        storyId,
        shareUrl,
      };

    } catch (error) {
      console.error('Save story error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Onbekende fout',
      };
    } finally {
      setIsSaving(false);
    }
  }, []);

  return {
    saveStory,
    isSaving,
    progress,
    progressMessage,
  };
};
