import { User } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

/** Compact account/login link for custom page headers */
export const AccountLink = ({ className = '' }: { className?: string }) => {
  const { user, loading } = useAuth();

  if (loading) return null;

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || '';
  const avatarUrl = user?.user_metadata?.avatar_url;
  const initials = displayName.slice(0, 2).toUpperCase();

  return user ? (
    <a href="/account" className={`hover:opacity-80 transition-opacity ${className}`}>
      <Avatar className="h-7 w-7">
        <AvatarImage src={avatarUrl} />
        <AvatarFallback className="bg-primary text-primary-foreground text-[10px]">
          {initials}
        </AvatarFallback>
      </Avatar>
    </a>
  ) : (
    <a
      href="/auth"
      className={`p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50 ${className}`}
    >
      <User className="h-4 w-4" />
    </a>
  );
};
