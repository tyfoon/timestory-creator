import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { FormData } from '@/types/form';
import { Language } from '@/lib/i18n';

export interface UserPreferences {
  language?: Language;
  timelineLength?: 'short' | 'long';
}

export interface UserFormData {
  birthDate?: { day: number; month: number; year: number };
  selectedPeriod?: string;
  customStartYear?: number;
  customEndYear?: number;
  optionalData?: Record<string, unknown>;
}

export const useUserSettings = () => {
  const { user } = useAuth();

  const saveSettings = useCallback(async (formData: UserFormData, preferences: UserPreferences) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('user_settings' as any)
      .upsert({
        user_id: user.id,
        form_data: formData,
        preferences,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' });

    if (error) console.error('Failed to save settings:', error);
  }, [user]);

  const loadSettings = useCallback(async (): Promise<{ formData: UserFormData; preferences: UserPreferences } | null> => {
    if (!user) return null;

    const { data, error } = await supabase
      .from('user_settings' as any)
      .select('form_data, preferences')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error || !data) return null;
    return {
      formData: (data as any).form_data || {},
      preferences: (data as any).preferences || {},
    };
  }, [user]);

  return { saveSettings, loadSettings };
};
