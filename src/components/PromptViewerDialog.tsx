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
import {
  LANGUAGE_INSTRUCTIONS,
  MONTH_NAMES,
  GET_NOSTALGIA_INSTRUCTIONS,
  VISUAL_DIRECTOR_INSTRUCTIONS,
  getContentFocusForPeriod,
  getGenerationPerspective,
  getNDJSONFormatInstructions,
  BIRTHDATE_PROMPT_SHORT,
  BIRTHDATE_PROMPT_FULL,
  RANGE_PROMPT,
  FAMOUS_BIRTHDAYS_ADDITION,
  BIRTHYEAR_IN_RANGE_ADDITION,
  PERSONAL_NAME_ADDITION,
  GEOGRAPHIC_FOCUS,
  INTERESTS_ADDITION,
  CITY_ADDITION,
  CHILDREN_ADDITION,
  GENDER_ADDITION,
  SUBCULTURE_ADDITION,
} from '@/lib/promptConstants';

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
  generation: 'bg-teal-500/20 text-teal-700 dark:text-teal-300 border-teal-500/30',
  nostalgia: 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30',
  famousBirthdays: 'bg-pink-500/20 text-pink-700 dark:text-pink-300 border-pink-500/30',
  birthyearInRange: 'bg-orange-500/20 text-orange-700 dark:text-orange-300 border-orange-500/30',
  personalName: 'bg-green-500/20 text-green-700 dark:text-green-300 border-green-500/30',
  geographic: 'bg-cyan-500/20 text-cyan-700 dark:text-cyan-300 border-cyan-500/30',
  interests: 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 border-yellow-500/30',
  city: 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-emerald-500/30',
  children: 'bg-red-500/20 text-red-700 dark:text-red-300 border-red-500/30',
  gender: 'bg-fuchsia-500/20 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/30',
  subculture: 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/30',
};

interface PromptSection {
  label: string;
  content: string;
  colorClass: string;
  source: string;
  isCollapsible?: boolean;
  defaultCollapsed?: boolean;
  /**
   * When false, the section is shown in the viewer for transparency,
   * but excluded from the concatenated prompt text and copy-to-clipboard.
   */
  includeInFullPrompt?: boolean;
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
    content: 'Je bent een nostalgische verhalenverteller, historicus en expert beeldredacteur.',
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
    content: VISUAL_DIRECTOR_INSTRUCTIONS.trim(),
    colorClass: PROMPT_COLORS.visualDirector,
    source: 'VISUAL_DIRECTOR_INSTRUCTIONS',
    isCollapsible: true,
    defaultCollapsed: true,
  });

  // 4. NDJSON Format Instructions
  sections.push({
    label: '📋 System: Output Formaat (NDJSON)',
    content: getNDJSONFormatInstructions(eventCount),
    colorClass: PROMPT_COLORS.format,
    source: 'getNDJSONFormatInstructions',
  });

  // =====================================================
  // USER PROMPT SECTIONS
  // =====================================================

  // Base prompt based on type
  if (formData.type === 'birthdate' && formData.birthDate) {
    const { day, month, year } = formData.birthDate;
    const monthName = MONTH_NAMES[month - 1];

    if (isShort) {
      sections.push({
        label: '📝 User: Basis Prompt (Kort)',
        content: BIRTHDATE_PROMPT_SHORT(day, monthName, year, maxEvents!, contentFocus),
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_SHORT',
      });
    } else {
      sections.push({
        label: '📝 User: Basis Prompt (Volledig)',
        content: BIRTHDATE_PROMPT_FULL(day, monthName, year, contentFocus),
        colorClass: PROMPT_COLORS.base,
        source: 'BIRTHDATE_PROMPT_FULL',
      });
    }
  } else if (formData.type === 'range' && formData.yearRange) {
    const { startYear, endYear } = formData.yearRange;
    const yearSpan = endYear - startYear;
    const targetEvents = isShort ? maxEvents! : Math.max(50, yearSpan * 5);
    const geoFocus = formData.optionalData?.focus || 'netherlands';

    // RANGE_PROMPT includes nostalgia + contentFocus embedded
    sections.push({
      label: '📝 User: Basis Prompt (Periode)',
      content: RANGE_PROMPT(startYear, endYear, isShort || false, targetEvents, contentFocus, geoFocus),
      colorClass: PROMPT_COLORS.base,
      source: 'RANGE_PROMPT (bevat NOSTALGIA + contentFocus)',
    });

    // Birthyear in range addition (comes before famous birthdays in backend)
    if (formData.birthDate) {
      const { year } = formData.birthDate;
      if (year >= startYear && year <= endYear) {
        sections.push({
          label: '⭐ User: Geboortejaar in Periode',
          content: BIRTHYEAR_IN_RANGE_ADDITION(year),
          colorClass: PROMPT_COLORS.birthyearInRange,
          source: 'BIRTHYEAR_IN_RANGE_ADDITION',
        });
      }
    }
  }

  // Generation perspective (added after base prompt, before other personalization)
  if (formData.birthDate && formData.birthDate.year) {
    sections.push({
      label: '🎯 User: Generatie Perspectief',
      content: getGenerationPerspective(formData.birthDate.year),
      colorClass: PROMPT_COLORS.generation,
      source: 'getGenerationPerspective',
    });
  }

  const { optionalData } = formData;

  // City (B1 in backend order)
  if (optionalData.city) {
    sections.push({
      label: '🏙️ User: Woonplaats Context',
      content: CITY_ADDITION(optionalData.city),
      colorClass: PROMPT_COLORS.city,
      source: 'CITY_ADDITION',
    });
  }

  // Gender (B2 in backend order)
  if (optionalData.gender && optionalData.gender !== 'none') {
    sections.push({
      label: '👤 User: Geslacht (GENDER)',
      content: GENDER_ADDITION(optionalData.gender),
      colorClass: PROMPT_COLORS.gender,
      source: 'GENDER_ADDITION',
    });
  } else {
    sections.push({
      label: '👤 User: Geslacht (GENDER) — geen voorkeur',
      content: 'Geen extra geslachts-instructie toegevoegd (gender = none).',
      colorClass: PROMPT_COLORS.gender,
      source: 'GENDER_ADDITION (overgeslagen)',
      includeInFullPrompt: false,
    });
  }

  // Subculture (B3 in backend order)
  if (optionalData.subculture?.myGroup) {
    const otherGroups = optionalData.subculture.otherGroupsFromEra
      ? optionalData.subculture.otherGroupsFromEra.split(", ").filter(Boolean)
      : [];
    const geoFocus = optionalData.focus || 'netherlands';
    sections.push({
      label: '🎸 User: Subcultuur (IDENTITEIT)',
      content: SUBCULTURE_ADDITION(optionalData.subculture.myGroup, otherGroups, geoFocus),
      colorClass: PROMPT_COLORS.subculture,
      source: 'SUBCULTURE_ADDITION',
    });
  } else {
    sections.push({
      label: '🎸 User: Subcultuur (IDENTITEIT) — geen voorkeur',
      content: 'Geen extra subcultuur-instructie toegevoegd (myGroup = null).',
      colorClass: PROMPT_COLORS.subculture,
      source: 'SUBCULTURE_ADDITION (overgeslagen)',
      includeInFullPrompt: false,
    });
  }

  // Geographic focus (B4 in backend order)
  if (optionalData.focus) {
    const focusText = GEOGRAPHIC_FOCUS[optionalData.focus];
    if (focusText) {
      sections.push({
        label: '🗺️ User: Geografische Focus',
        content: focusText,
        colorClass: PROMPT_COLORS.geographic,
        source: 'GEOGRAPHIC_FOCUS',
      });
    }
  }

  // Personal name (C1 in backend order)
  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    sections.push({
      label: '👤 User: Persoonlijke Naam',
      content: PERSONAL_NAME_ADDITION(fullName),
      colorClass: PROMPT_COLORS.personalName,
      source: 'PERSONAL_NAME_ADDITION',
    });
  }

  // Interests (C2 in backend order)
  if (optionalData.interests) {
    sections.push({
      label: '💡 User: Interesses',
      content: INTERESTS_ADDITION(optionalData.interests),
      colorClass: PROMPT_COLORS.interests,
      source: 'INTERESTS_ADDITION',
    });
  }

  // Children (C3 in backend order)
  if (optionalData.children && optionalData.children.length > 0) {
    const childrenInfo = optionalData.children
      .filter(c => c.name && c.birthDate?.year)
      .map(c => `${c.name} (${c.birthDate?.day}-${c.birthDate?.month}-${c.birthDate?.year})`);

    if (childrenInfo.length > 0) {
      sections.push({
        label: '👶 User: Kinderen',
        content: CHILDREN_ADDITION(childrenInfo),
        colorClass: PROMPT_COLORS.children,
        source: 'CHILDREN_ADDITION',
      });
    }
  }

  // Partner name
  if (optionalData.partnerName) {
    sections.push({
      label: '💑 User: Partner',
      content: `Partner: ${optionalData.partnerName}`,
      colorClass: PROMPT_COLORS.personalName,
      source: 'partnerName',
    });
  }

  // Famous birthdays addition (at the end, D block in backend)
  if (formData.type === 'range' && formData.yearRange && formData.birthDate) {
    const { day, month } = formData.birthDate;
    const monthName = MONTH_NAMES[month - 1];
    const { startYear, endYear } = formData.yearRange;

    sections.push({
      label: '🎂 User: Beroemde Verjaardagen',
      content: FAMOUS_BIRTHDAYS_ADDITION(day, monthName, startYear, endYear),
      colorClass: PROMPT_COLORS.famousBirthdays,
      source: 'FAMOUS_BIRTHDAYS_ADDITION',
    });
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

  const includeInFull = (s: PromptSection) => s.includeInFullPrompt !== false;
  const fullSystemPrompt = systemSections.filter(includeInFull).map(s => s.content).join('\n\n');
  const fullUserPrompt = userSections.filter(includeInFull).map(s => s.content).join('\n');

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

        {/* Sync warning */}
        <div className="shrink-0 text-[10px] text-muted-foreground bg-muted/30 px-2 py-1 rounded border border-dashed">
          ⚠️ Mirror van <code className="font-mono">supabase/functions/_shared/prompts.ts</code> via <code className="font-mono">src/lib/promptConstants.ts</code>
        </div>

        {/* Legend */}
        <div className="shrink-0 flex flex-wrap gap-1.5 text-[10px] py-2 border-b">
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.system}`}>System</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.language}`}>Taal</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.visualDirector}`}>Visual</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.format}`}>Format</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.base}`}>Basis</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.generation}`}>Generatie</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.city}`}>Stad</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.gender}`}>Geslacht</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.subculture}`}>Subcultuur</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.geographic}`}>Geo</span>
          <span className={`px-1.5 py-0.5 rounded border ${PROMPT_COLORS.personalName}`}>Naam</span>
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
