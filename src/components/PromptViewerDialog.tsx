import { useState } from 'react';
import { FileText, Copy, Check, ChevronDown, ChevronRight } from 'lucide-react';
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
  system: 'bg-slate-500/20 text-slate-700 dark:text-slate-300 border-slate-500/30',
  language: 'bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 border-indigo-500/30',
  visualDirector: 'bg-violet-500/20 text-violet-700 dark:text-violet-300 border-violet-500/30',
  format: 'bg-gray-500/20 text-gray-700 dark:text-gray-300 border-gray-500/30',
  base: 'bg-blue-500/20 text-blue-700 dark:text-blue-300 border-blue-500/30',
  nostalgia: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  famousBirthdays: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  birthyearInRange: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  personalName: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  geographic: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  interests: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  city: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  children: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
};

const MONTH_NAMES = [
  'januari', 'februari', 'maart', 'april', 'mei', 'juni',
  'juli', 'augustus', 'september', 'oktober', 'november', 'december'
];

const LANGUAGE_INSTRUCTIONS: Record<string, string> = {
  nl: "Schrijf alle tekst in het Nederlands.",
  en: "Write all text in English.",
  de: "Schreibe alle Texte auf Deutsch.",
  fr: "Écrivez tout le texte en français.",
};

interface PromptSection {
  label: string;
  content: string;
  colorClass: string;
  source: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
}

// Mirrored from prompts.ts - Visual Director Instructions
const VISUAL_DIRECTOR_INSTRUCTIONS = `ROL: BEELDREDACTEUR (CRUCIAAL)
Jij bepaalt NIET ALLEEN de zoekterm, maar ook het TYPE afbeelding ('visualSubjectType').

⚠️ ABSOLUUT VERBODEN IN ZOEKOPDRACHTEN ⚠️
NOOIT decade-referenties: "1980s", "80s", "jaren 80"

KIES HET JUISTE 'visualSubjectType':
1. 'person': Artiesten, politici, sporters
2. 'movie': ALLEEN bioscoopFILMS (E.T., Titanic)
3. 'tv': ALLEEN TV-SERIES (Dallas, Beverly Hills 90210, Friends)
4. 'product': Gadgets, speelgoed, auto's
5. 'logo': Software, websites, games
6. 'event': Oorlogen, rampen, kroningen
7. 'location': Steden, gebouwen
8. 'artwork': Albums, boekomslagen
9. 'culture': Rages, mode, dansstijlen

⚠️ CRUCIAAL: FILM vs TV-SERIE ⚠️
BIOSCOOPFILM (isMovie: true): E.T., Titanic, Star Wars
TV-SERIE (isTV: true): Beverly Hills 90210, Dallas, Baywatch

⚠️ TWEE TALEN! ⚠️
'imageSearchQuery' = NEDERLANDS
'imageSearchQueryEn' = ENGELS

WEER EVENTS: Zoek ALLEEN op fenomeen (Sneeuwpret, Hittegolf), NIET op locatie!
SPORT: ALTIJD de sport vermelden (voetbal, tennis)
MUZIEK: "Artiest Titel" formaat, GEEN extra woorden`;

// Mirrored from prompts.ts - Nostalgia Instructions
const NOSTALGIA_INSTRUCTIONS = `RICHTLIJNEN VOOR SFEER & NOSTALGIE:
1. **Zintuiglijke Details:** Beschrijf hoe het voelde, rook of klonk.
2. **De 'Lens' van de Leeftijd:** Bekijk nieuws door de ogen van de gebruiker.
3. **Analoge Vertraging:** Benadruk dingen die nu weg zijn.
4. **Schrijfstijl:** Persoonlijke, licht mijmerende toon.`;

function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case 'birthyear':
      return 'FOCUS: Events uit het exacte geboortejaar. Wereldgebeurtenissen, politiek, muziek, films, cultuur van dat jaar.';
    case 'childhood':
      return 'FOCUS: Kindertijd (0-12 jaar). Speelgoed, tekenfilms, kinderprogramma\'s, games, snoep, lagere school.';
    case 'puberty':
      return 'FOCUS: Puberteit (12-18 jaar). Muziek, films, TV, mode, games, eerste telefoons, middelbare school.';
    case 'young-adult':
      return 'FOCUS: Jongvolwassenheid (18-25 jaar). Studententijd, eerste baan, festivals, politiek, technologie.';
    default:
      return 'FOCUS: Algemene mix van belangrijke wereldgebeurtenissen, cultuur, sport, wetenschap en entertainment.';
  }
}

function buildPromptSections(formData: FormData, language: string, maxEvents?: number): PromptSection[] {
  const sections: PromptSection[] = [];
  const isShort = maxEvents && maxEvents <= 20;
  const periodType = formData.optionalData?.periodType;
  const eventCount = isShort ? maxEvents : 50;
  const contentFocus = getContentFocusForPeriod(periodType);

  // =====================================================
  // SYSTEM PROMPT SECTIONS
  // =====================================================
  
  // 1. Base System Role
  sections.push({
    label: '🤖 System: Basis Rol',
    content: 'Je bent een historicus en expert beeldredacteur.',
    colorClass: PROMPT_COLORS.system,
    source: 'getNDJSONSystemPrompt',
  });

  // 2. Language Instructions
  sections.push({
    label: '🌍 System: Taalinstructie',
    content: LANGUAGE_INSTRUCTIONS[language] || LANGUAGE_INSTRUCTIONS.nl,
    colorClass: PROMPT_COLORS.language,
    source: 'LANGUAGE_INSTRUCTIONS',
  });

  // 3. Visual Director Instructions (collapsible because it's huge)
  sections.push({
    label: '🎬 System: Visual Director',
    content: VISUAL_DIRECTOR_INSTRUCTIONS,
    colorClass: PROMPT_COLORS.visualDirector,
    source: 'VISUAL_DIRECTOR_INSTRUCTIONS',
    isCollapsible: true,
    defaultCollapsed: true,
  });

  // 4. NDJSON Format Instructions
  sections.push({
    label: '📋 System: Output Formaat (NDJSON)',
    content: `KRITISCH - OUTPUT FORMAAT (NDJSON):
Stuur ELKE gebeurtenis als apart JSON-object op nieuwe regel.

FORMAT PER REGEL:
{"type":"event","data":{"id":"evt_1","date":"1980-05-22","year":1980,"title":"...","category":"...","visualSubjectType":"...","imageSearchQuery":"...","imageSearchQueryEn":"...",...}}

NA ALLE EVENTS:
{"type":"summary","data":"Samenvatting..."}
{"type":"famousBirthdays","data":[...]}

REGELS:
1. GEEN markdown
2. Genereer ${eventCount} events
3. Vul 'visualSubjectType' ALTIJD in
4. 'isTV: true' voor TV-series, 'isMovie: true' voor films
5. Vul 'spotifySearchQuery' / 'movieSearchQuery' in waar relevant`,
    colorClass: PROMPT_COLORS.format,
    source: 'getNDJSONSystemPrompt',
  });

  // =====================================================
  // USER PROMPT SECTIONS
  // =====================================================

  // Base prompt based on type (includes contentFocus embedded!)
  if (formData.type === 'birthdate' && formData.birthDate) {
    const { day, month, year } = formData.birthDate;
    const monthName = MONTH_NAMES[month - 1];

    if (isShort) {
      sections.push({
        label: '📝 User: Basis Prompt (Kort)',
        content: `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer PRECIES ${maxEvents} events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: Minimaal 2, Maximaal 4 (Nr 1 hits).
- BEROEMDHEDEN: Maximaal 2.
${contentFocus}`,
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_SHORT',
      });
    } else {
      sections.push({
        label: '📝 User: Basis Prompt (Volledig)',
        content: `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.
Genereer 50 events in NDJSON formaat.
HARDE EISEN:
- MUZIEK: 5-10 events.
- BEROEMDHEDEN: Max 5.
${contentFocus}`,
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_FULL',
      });
    }
  } else if (formData.type === 'range' && formData.yearRange) {
    const { startYear, endYear } = formData.yearRange;
    const yearSpan = endYear - startYear;
    const targetEvents = isShort ? maxEvents! : Math.max(50, yearSpan * 5);

    // RANGE_PROMPT includes nostalgia + contentFocus embedded
    sections.push({
      label: '📝 User: Basis Prompt (Periode)',
      content: `Maak een nostalgische tijdlijn van ${startYear} tot ${endYear}.
Genereer ${targetEvents} events.

${NOSTALGIA_INSTRUCTIONS}

${contentFocus}`,
      colorClass: PROMPT_COLORS.base,
      source: 'RANGE_PROMPT (bevat NOSTALGIA + contentFocus)',
    });

    // Famous birthdays addition for range
    if (formData.birthDate) {
      const { day, month, year } = formData.birthDate;
      const monthName = MONTH_NAMES[month - 1];

      sections.push({
        label: '🎂 User: Beroemde Verjaardagen',
        content: `Zoek personen die op ${day} ${monthName} jarig zijn.`,
        colorClass: PROMPT_COLORS.famousBirthdays,
        source: 'FAMOUS_BIRTHDAYS_ADDITION',
      });

      if (year >= startYear && year <= endYear) {
        sections.push({
          label: '⭐ User: Geboortejaar in Periode',
          content: `Het geboortejaar ${year} is speciaal.`,
          colorClass: PROMPT_COLORS.birthyearInRange,
          source: 'BIRTHYEAR_IN_RANGE_ADDITION',
        });
      }
    }
  }

  const { optionalData } = formData;

  // Personal name
  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    sections.push({
      label: '👤 User: Persoonlijke Naam',
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
      label: '🗺️ User: Geografische Focus',
      content: focusMap[optionalData.focus] || '',
      colorClass: PROMPT_COLORS.geographic,
      source: 'GEOGRAPHIC_FOCUS',
    });
  }

  // Interests
  if (optionalData.interests) {
    sections.push({
      label: '💡 User: Interesses',
      content: `Interesses: ${optionalData.interests}.`,
      colorClass: PROMPT_COLORS.interests,
      source: 'INTERESTS_ADDITION',
    });
  }

  // City
  if (optionalData.city) {
    sections.push({
      label: '🏙️ User: Woonplaats Context',
      content: `LOCATIE CONTEXT: **${optionalData.city}**.
De gebruiker groeide hier op. Maak de tijdlijn specifiek voor ${optionalData.city}:
1. **Lokale Hotspots:** Zoek naar discotheken, bioscopen, parken uit die tijd.
2. **Lokale Sfeer:** Hoe voelde het om hier te wonen?
3. **Events:** Was er een groot lokaal evenement?`,
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
        label: '👶 User: Kinderen',
        content: `Kinderen: ${childrenInfo.join(', ')}`,
        colorClass: PROMPT_COLORS.children,
        source: 'CHILDREN_ADDITION',
      });
    }
  }

  return sections;
}

function CollapsibleSection({ section }: { section: PromptSection }) {
  const [isOpen, setIsOpen] = useState(!section.defaultCollapsed);

  if (!section.isCollapsible) {
    return (
      <div className={`rounded-lg border p-3 ${section.colorClass}`}>
        <div className="flex items-center justify-between mb-2">
          <span className="font-semibold text-sm">{section.label}</span>
          <span className="text-[10px] font-mono opacity-70">{section.source}</span>
        </div>
        <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
          {section.content}
        </pre>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border ${section.colorClass}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-3 flex items-center justify-between text-left"
      >
        <div className="flex items-center gap-2">
          {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          <span className="font-semibold text-sm">{section.label}</span>
        </div>
        <span className="text-[10px] font-mono opacity-70">{section.source}</span>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-0">
          <pre className="text-xs whitespace-pre-wrap font-mono leading-relaxed">
            {section.content}
          </pre>
        </div>
      )}
    </div>
  );
}

export function PromptViewerDialog({ formData, language, maxEvents }: PromptViewerDialogProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!formData) return null;

  const sections = buildPromptSections(formData, language, maxEvents);
  
  // Build full prompt: System sections first, then User sections
  const systemSections = sections.filter(s => s.label.includes('System'));
  const userSections = sections.filter(s => s.label.includes('User'));
  
  const fullSystemPrompt = systemSections.map(s => s.content).join('\n\n');
  const fullUserPrompt = userSections.map(s => s.content).join('\n');

  const handleCopy = async () => {
    const fullText = `=== SYSTEM PROMPT ===\n${fullSystemPrompt}\n\n=== USER PROMPT ===\n${fullUserPrompt}`;
    await navigator.clipboard.writeText(fullText);
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
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.system}`}>System</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.language}`}>Taal</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.visualDirector}`}>Visual</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.format}`}>Format</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.base}`}>Basis</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.personalName}`}>Naam</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.geographic}`}>Geo</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.city}`}>Stad</span>
        </div>

        {/* Prompt sections */}
        <div className="flex-1 min-h-0 overflow-y-auto pr-2 space-y-3 py-3">
          {/* System Prompt Header */}
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide border-b pb-1">
            System Prompt
          </div>
          {systemSections.map((section, index) => (
            <CollapsibleSection key={`sys-${index}`} section={section} />
          ))}

          {/* User Prompt Header */}
          <div className="text-xs font-bold text-muted-foreground uppercase tracking-wide border-b pb-1 pt-2">
            User Prompt
          </div>
          {userSections.map((section, index) => (
            <CollapsibleSection key={`usr-${index}`} section={section} />
          ))}
        </div>

        {/* Full prompt preview */}
        <div className="shrink-0 pt-2 border-t">
          <details className="group">
            <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
              Bekijk volledige prompt (plain text)
            </summary>
            <pre className="mt-2 p-2 bg-muted rounded text-[10px] font-mono whitespace-pre-wrap max-h-32 overflow-y-auto">
              {`=== SYSTEM PROMPT ===\n${fullSystemPrompt}\n\n=== USER PROMPT ===\n${fullUserPrompt}`}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
