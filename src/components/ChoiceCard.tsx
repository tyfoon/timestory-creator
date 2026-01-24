import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface ChoiceCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
}

export const ChoiceCard = ({ icon: Icon, title, description, selected, onClick }: ChoiceCardProps) => {
  return (
    <button
      onClick={onClick}
      className={cn(
        "choice-card w-full p-8 rounded-lg bg-card text-left",
        "border-2 transition-all duration-300",
        selected 
          ? "border-accent bg-accent/5" 
          : "border-transparent hover:border-border"
      )}
    >
      <div className={cn(
        "w-14 h-14 rounded-full flex items-center justify-center mb-5 transition-colors",
        selected ? "bg-gradient-gold" : "bg-secondary"
      )}>
        <Icon className={cn(
          "h-7 w-7 transition-colors",
          selected ? "text-primary-foreground" : "text-muted-foreground"
        )} />
      </div>
      
      <h3 className="font-serif text-xl font-semibold text-foreground mb-2">
        {title}
      </h3>
      
      <p className="text-muted-foreground leading-relaxed">
        {description}
      </p>
      
      {selected && (
        <div className="mt-4 flex items-center gap-2 text-accent font-medium">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" />
          Geselecteerd
        </div>
      )}
    </button>
  );
};
