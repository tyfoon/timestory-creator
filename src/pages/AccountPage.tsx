import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/integrations/supabase/client';
import { Header } from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LogOut, Clock, ExternalLink, Share2, Trash2, CreditCard, Loader2, Bookmark } from 'lucide-react';
import { SavedEventCard } from '@/components/account/SavedEventCard';
import { useToast } from '@/hooks/use-toast';

interface SavedStory {
  id: string;
  created_at: string;
  content: {
    storyTitle?: string;
    events?: any[];
    summary?: string;
  };
  settings: any;
  is_public: boolean;
}

interface SavedEvent {
  id: string;
  event_title: string;
  event_date?: string;
  event_year?: number;
  event_description?: string;
  event_category?: string;
  image_url?: string;
  created_at: string;
}

const AccountPage = () => {
  const { user, loading: authLoading, signOut } = useAuth();
  const { t, language } = useLanguage();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stories, setStories] = useState<SavedStory[]>([]);
  const [savedEvents, setSavedEvents] = useState<SavedEvent[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [subscribed, setSubscribed] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [billingLoading, setBillingLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  // Load user's saved stories
  const loadStories = useCallback(async () => {
    if (!user) return;
    setLoadingStories(true);
    // Use any to avoid deep type instantiation with user_id column
    const { data, error } = await (supabase
      .from('saved_stories')
      .select('id, created_at, content, settings, is_public') as any)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setStories(data as SavedStory[]);
    }
    setLoadingStories(false);
  }, [user]);

  // Check subscription status
  const checkSubscription = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase.functions.invoke('check-subscription');
      if (!error && data) {
        setSubscribed(data.subscribed || false);
        setSubscriptionEnd(data.subscription_end || null);
      }
    } catch {
      // Subscription check failed silently
    }
  }, [user]);

  // Load user's saved events
  const loadEvents = useCallback(async () => {
    if (!user) return;
    setLoadingEvents(true);
    const { data, error } = await (supabase
      .from('saved_events' as any)
      .select('*') as any)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setSavedEvents(data as SavedEvent[]);
    }
    setLoadingEvents(false);
  }, [user]);

  useEffect(() => {
    if (user) {
      loadStories();
      loadEvents();
      checkSubscription();
    }
  }, [user, loadStories, loadEvents, checkSubscription]);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const handleDeleteStory = async (storyId: string) => {
    if (!confirm(String(t('accountDeleteConfirm')))) return;
    const { error } = await supabase
      .from('saved_stories')
      .delete()
      .eq('id', storyId);
    if (!error) {
      setStories(prev => prev.filter(s => s.id !== storyId));
      toast({ title: String(t('accountStoryDeleted')) });
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const { error } = await (supabase
      .from('saved_events' as any)
      .delete() as any)
      .eq('id', eventId);
    if (!error) {
      setSavedEvents(prev => prev.filter(e => e.id !== eventId));
      toast({ title: String(t('eventDeleted')) });
    }
  };

  const handleShare = (storyId: string) => {
    const url = `${window.location.origin}/s/${storyId}`;
    navigator.clipboard.writeText(url);
    toast({ title: String(t('shareNow')), description: url });
  };

  const handleCheckout = async () => {
    setBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({ title: String(t('authError')), description: error.message, variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  const handleManageSubscription = async () => {
    setBillingLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('customer-portal');
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error: any) {
      toast({ title: String(t('authError')), description: error.message, variant: 'destructive' });
    } finally {
      setBillingLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Clock className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return null;

  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || '';
  const avatarUrl = user.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString(
      language === 'nl' ? 'nl-NL' : language === 'de' ? 'de-DE' : language === 'fr' ? 'fr-FR' : 'en-US',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto px-4 pt-24 pb-12 max-w-2xl space-y-6">
        {/* Profile Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="font-serif text-2xl">{displayName}</CardTitle>
                <CardDescription>{user.email}</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Billing Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              {String(t('accountBilling'))}
            </CardTitle>
            <CardDescription>{String(t('accountBillingDesc'))}</CardDescription>
          </CardHeader>
          <CardContent>
            {subscribed ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="inline-block w-2 h-2 rounded-full bg-accent" />
                  <span className="text-sm font-medium text-foreground">Premium</span>
                  {subscriptionEnd && (
                    <span className="text-xs text-muted-foreground">
                      — {formatDate(subscriptionEnd)}
                    </span>
                  )}
                </div>
                <Button variant="outline" onClick={handleManageSubscription} disabled={billingLoading} className="w-full">
                  {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {String(t('accountManageSubscription'))}
                </Button>
              </div>
            ) : (
              <Button onClick={handleCheckout} disabled={billingLoading} className="w-full">
                {billingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Premium — €9,99/{language === 'en' ? 'month' : language === 'de' ? 'Monat' : language === 'fr' ? 'mois' : 'maand'}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Saved Stories Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg">{String(t('accountSavedStories'))}</CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStories ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : stories.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-serif">{String(t('accountNoContent'))}</p>
                <p className="text-sm mt-1">{String(t('accountNoContentDesc'))}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stories.map((story) => (
                  <div
                    key={story.id}
                    className="rounded-lg border border-border p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-serif font-medium text-foreground truncate">
                          {story.content?.storyTitle || 'Untitled'}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {String(t('accountCreatedAt'))} {formatDate(story.created_at)}
                          {story.content?.events && (
                            <> · {story.content.events.length} {String(t('accountEvents'))}</>
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/s/${story.id}`)}
                          title={String(t('accountViewStory'))}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleShare(story.id)}
                          title={String(t('accountShareStory'))}
                        >
                          <Share2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteStory(story.id)}
                          title={String(t('accountDeleteStory'))}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Saved Events Card */}
        <Card>
          <CardHeader>
            <CardTitle className="font-serif text-lg flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              {String(t('accountSavedEvents'))}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingEvents ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="rounded-lg border border-border p-6 text-center text-muted-foreground">
                <Bookmark className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="font-serif">{String(t('accountNoSavedEvents'))}</p>
                <p className="text-sm mt-1">{String(t('accountNoSavedEventsDesc'))}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedEvents.map((event) => (
                  <div
                    key={event.id}
                    className="rounded-lg border border-border p-3 hover:bg-muted/50 transition-colors flex gap-3"
                  >
                    {/* Event image thumbnail */}
                    {event.image_url && (
                      <div className="w-16 h-16 flex-shrink-0 rounded-md overflow-hidden">
                        <img
                          src={event.image_url}
                          alt={event.event_title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className="font-serif font-medium text-foreground text-sm truncate">
                            {event.event_title}
                          </h4>
                          {event.event_date && (
                            <p className="text-xs text-muted-foreground">{event.event_date}</p>
                          )}
                          {event.event_description && (
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                              {event.event_description}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteEvent(event.id)}
                          title={String(t('accountDeleteStory'))}
                          className="text-destructive hover:text-destructive flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Button variant="outline" onClick={handleSignOut} className="w-full">
          <LogOut className="mr-2 h-4 w-4" />
          {String(t('authLogout'))}
        </Button>
      </div>
    </div>
  );
};

export default AccountPage;
