import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FormData } from '@/types/form';

interface PromptViewerDialogProps {
  formData: FormData | null;
  language: string;
  maxEvents?: number;
}

// Color mapping for different prompt parts
const PROMPT_COLORS = {
  base: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  contentFocus: 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border-purple-500/30',
  nostalgia: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  famousBirthdays: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  birthyearInRange: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  personalName: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  geographic: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  interests: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  city: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  children: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  system: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
};

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

interface PromptSection {
  label: string;
  content: string;
  colorClass: string;
  source: string;
}

function buildPromptSections(formData: FormData, language: string, maxEvents?: number): PromptSection[] {
  const sections: PromptSection[] = [];
  const isShort = maxEvents && maxEvents <= 20;
  const periodType = formData.optionalData?.periodType;

  // Get content focus based on period type
  const getContentFocusForPeriod = (pt?: string): string => {
    switch (pt) {
      case 'birthyear':
        return 'FOCUS: Events uit het exacte geboortejaar. Wereldgebeurtenissen, politiek, muziek, films, cultuur van dat jaar.';
      case 'childhood':
        return 'FOCUS: Kindertijd (0-12 jaar). Speelgoed, tekenfilms, kinderprogramma\'s, games, snoep, lagere school, kindercultuur.';
      case 'puberty':
        return 'FOCUS: Puberteit (12-18 jaar). Muziek, films, TV, mode, games, eerste telefoons, sociale media, middelbare school, jeugdcultuur.';
      case 'young-adult':
        return 'FOCUS: Jongvolwassenheid (18-25 jaar). Studententijd, eerste baan, festivals, politiek ontwaken, technologie.';
      default:
        return 'FOCUS: Algemene mix van belangrijke wereldgebeurtenissen, cultuur, sport, wetenschap en entertainment.';
    }
  };

  const contentFocus = getContentFocusForPeriod(periodType);

  // Base prompt based on type
  if (formData.type === 'birthdate' && formData.birthDate) {
    const { day, month, year } = formData.birthDate;
    const monthName = MONTH_NAMES[month - 1];

    if (isShort) {
      sections.push({
        label: 'Basis Prompt (Kort)',
        content: `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer PRECIES ${maxEvents} events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: Minimaal 2, Maximaal 4 (Nr 1 hits).
- BEROEMDHEDEN: Maximaal 2.`,
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_SHORT',
      });
    } else {
      sections.push({
        label: 'Basis Prompt (Volledig)',
        content: `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer 50 events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: 5-10 events.
- BEROEMDHEDEN: Max 5.`,
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_FULL',
      });
    }
  } else if (formData.type === 'range' && formData.yearRange) {
    const { startYear, endYear } = formData.yearRange;
    const yearSpan = endYear - startYear;
    const targetEvents = isShort ? maxEvents! : Math.max(50, yearSpan * 5);

    sections.push({
      label: 'Basis Prompt (Periode)',
      content: `Maak een nostalgische tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.`,
      colorClass: PROMPT_COLORS.base,
      source: 'RANGE_PROMPT',
    });

    // Nostalgia instructions for range prompts
    sections.push({
      label: 'Nostalgie Richtlijnen',
      content: `RICHTLIJNEN VOOR SFEER & NOSTALGIE:
1. **Zintuiglijke Details:** Beschrijf niet alleen wat er gebeurde, maar hoe het voelde, rook of klonk. (Bv. het geluid van inbellen, de geur van brommerbenzine).
2. **De 'Lens' van de Leeftijd:** Bekijk wereldnieuws door de ogen van de gebruiker op die leeftijd.
3. **Analoge Vertraging:** Benadruk dingen die nu weg zijn: wachten op de bus zonder mobiel, foto's laten ontwikkelen.
4. **Schrijfstijl:** Gebruik een persoonlijke, licht mijmerende toon.`,
      colorClass: PROMPT_COLORS.nostalgia,
      source: 'NOSTALGIA_INSTRUCTIONS',
    });

    // Famous birthdays addition for range
    if (formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      const monthName = MONTH_NAMES[month - 1];

      sections.push({
        label: 'Beroemde Verjaardagen',
        content: `Zoek personen die op ${day} ${monthName} jarig zijn.`,
        colorClass: PROMPT_COLORS.famousBirthdays,
        source: 'FAMOUS_BIRTHDAYS_ADDITION',
      });

      if (year >= startYear && year <= endYear) {
        sections.push({
          label: 'Geboortejaar in Periode',
          content: `Het geboortejaar ${year} is speciaal.`,
          colorClass: PROMPT_COLORS.birthyearInRange,
          source: 'BIRTHYEAR_IN_RANGE_ADDITION',
        });
      }
    }
  }

  // Content focus (period type)
  sections.push({
    label: 'Content Focus',
    content: contentFocus,
    colorClass: PROMPT_COLORS.contentFocus,
    source: 'getContentFocusForPeriod',
  });

  const { optionalData } = formData;

  // Personal name
  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    sections.push({
      label: 'Persoonlijke Naam',
      content: `Tijdlijn voor: ${fullName}.`,
      colorClass: PROMPT_COLORS.personalName,
      source: 'PERSONAL_NAME_ADDITION',
    });
  }

  // Geographic focus
  if (optionalData.focus) {
    const focusMap: Record<string, string> = {
      netherlands: 'Focus: Nederland.',
      europe: 'Focus: Europa.',
      world: 'Focus: Wereld.',
    };
    sections.push({
      label: 'Geografische Focus',
      content: focusMap[optionalData.focus] || '',
      colorClass: PROMPT_COLORS.geographic,
      source: 'GEOGRAPHIC_FOCUS',
    });
  }

  // Interests
  if (optionalData.interests) {
    sections.push({
      label: 'Interesses',
      content: `Interesses: ${optionalData.interests}.`,
      colorClass: PROMPT_COLORS.interests,
      source: 'INTERESTS_ADDITION',
    });
  }

  // City (extended with local context)
  if (optionalData.city) {
    sections.push({
      label: 'Woonplaats Context',
      content: `LOCATIE CONTEXT: **${optionalData.city}**.
De gebruiker groeide hier op. Maak de tijdlijn specifiek voor ${optionalData.city}:
1. **Lokale Hotspots:** Zoek naar specifieke discotheken, bioscopen, parken of hangplekken in ${optionalData.city} uit die tijd.
2. **Lokale Sfeer:** Hoe voelde het om in ${optionalData.city} te wonen? (Provinciaal vs Stedelijk).
3. **Events:** Was er een groot lokaal evenement of feest in die jaren?`,
      colorClass: PROMPT_COLORS.city,
      source: 'CITY_ADDITION',
    });
  }

  // Children
  if (optionalData.children && optionalData.children.length > 0) {
    const childrenInfo = optionalData.children
      .filter(c => c.name && c.birthDate?.year)
      .map(c => `${c.name} (${c.birthDate?.day}-${c.birthDate?.month}-${c.birthDate?.year})`);

    if (childrenInfo.length > 0) {
      sections.push({
        label: 'Kinderen',
        content: `Kinderen: ${childrenInfo.join(', ')}`,
        colorClass: PROMPT_COLORS.children,
        source: 'CHILDREN_ADDITION',
      });
    }
  }

  return sections;
}

export function PromptViewerDialog({ formData, language, maxEvents }: PromptViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!formData) return null;

  const sections = buildPromptSections(formData, language, maxEvents);
  const fullPrompt = sections.map(s => s.content).join('\n');

  const handleCopy = async () => {
    await navigator.clipboard.writeText(fullPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          className="p-1.5 text-muted-foreground hover:text-foreground transition-colors rounded-md hover:bg-muted/50"
          title="Bekijk AI prompt"
        >
          <FileText className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0 pb-2">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              AI Prompt Viewer
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="gap-1.5"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Gekopieerd
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  Kopieer
                </>
              )}
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Legend */}
        <div className="shrink-0 flex flex-wrap gap-1.5 text-[10px] pb-2 border-b">
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.base}`}>Basis</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.contentFocus}`}>Focus</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.nostalgia}`}>Nostalgie</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.famousBirthdays}`}>Birthdays</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.personalName}`}>Naam</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.geographic}`}>Geo</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.interests}`}>Interesses</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.city}`}>Stad</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.children}`}>Kinderen</span>
        </div>

        {/* Prompt sections */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3 py-3">
          {sections.map((section, index) => (
            <div
              key={index}
              className={`rounded-lg border p-3 ${section.colorClass}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-semibold text-sm">{section.label}</span>
                <span className="text-[10px] font-mono opacity-70">{section.source}</span>
              </div>
              <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
                {section.content}
              </pre>
            </div>
          ))}
        </div>

        {/* Full prompt preview */}
        <div className="shrink-0 pt-2 border-t">
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Bekijk volledige prompt (plain text)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {fullPrompt}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
