import { LanguageSelector } from './LanguageSelector';
import { Clock } from 'lucide-react';
export const Header = () => {
  return <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <a href="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-full bg-gradient-gold flex items-center justify-center shadow-soft group-hover:shadow-card transition-shadow">
            <Clock className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-serif text-xl font-semibold text-primary">Het jaar van</span>
        </a>
        <LanguageSelector />
      </div>
    </header>;
};