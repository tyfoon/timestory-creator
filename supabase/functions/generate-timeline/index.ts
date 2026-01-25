import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface TimelineRequest {
  type: 'birthdate' | 'range';
  birthDate?: { day: number; month: number; year: number };
  yearRange?: { startYear: number; endYear: number };
  optionalData: {
    firstName?: string;
    lastName?: string;
    city?: string;
    children: { name: string; birthDate?: { day: number; month: number; year: number } }[];
    partnerName?: string;
    partnerBirthDate?: { day: number; month: number; year: number };
    interests?: string;
    focus: 'netherlands' | 'europe' | 'world';
  };
  language: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const requestData: TimelineRequest = await req.json();
    console.log("Received request:", JSON.stringify(requestData, null, 2));

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build the prompt based on request type
    const prompt = buildPrompt(requestData);
    console.log("Generated prompt:", prompt);

    // Call AI to generate timeline events
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { 
            role: "system", 
            content: getSystemPrompt(requestData.language) 
          },
          { role: "user", content: prompt },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "create_timeline",
              description: "Creates a timeline with historical events, returning structured data",
              parameters: {
                type: "object",
                properties: {
                  events: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        date: { type: "string", description: "Date in format YYYY-MM-DD or YYYY-MM or YYYY" },
                        year: { type: "number" },
                        month: { type: "number" },
                        day: { type: "number" },
                        title: { type: "string" },
                        description: { type: "string" },
                        category: { 
                          type: "string", 
                          enum: ["politics", "sports", "entertainment", "science", "culture", "world", "local", "personal", "music", "technology", "celebrity"] 
                        },
                        imageSearchQuery: { type: "string", description: "Search query to find a relevant image for this event" },
                        importance: { type: "string", enum: ["high", "medium", "low"] },
                        eventScope: { 
                          type: "string", 
                          enum: ["birthdate", "birthmonth", "birthyear", "period"],
                          description: "Whether this event is from the exact birth date, birth month, birth year, or general period"
                        },
                        isCelebrityBirthday: { type: "boolean", description: "True if this is about a famous person born on the same date" }
                      },
                      required: ["id", "date", "year", "title", "description", "category", "importance", "eventScope"]
                    }
                  },
                  summary: {
                    type: "string",
                    description: "A brief summary of the era/period covered"
                  },
                  famousBirthdays: {
                    type: "array",
                    description: "List of famous people born on the same date (day and month)",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        profession: { type: "string" },
                        birthYear: { type: "number" },
                        imageSearchQuery: { type: "string" }
                      },
                      required: ["name", "profession", "birthYear"]
                    }
                  }
                },
                required: ["events", "summary"]
              }
            }
          }
        ],
        tool_choice: { type: "function", function: { name: "create_timeline" } }
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Te veel verzoeken. Probeer het later opnieuw." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Credits op. Voeg credits toe aan je workspace." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log("AI response received");

    // Extract the tool call result
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_timeline") {
      throw new Error("Invalid AI response - no timeline data");
    }

    const timelineData = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${timelineData.events?.length || 0} events`);
    console.log(`Famous birthdays: ${timelineData.famousBirthdays?.length || 0}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: timelineData 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating timeline:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function getSystemPrompt(language: string): string {
  const langInstructions = {
    nl: "Schrijf alle tekst in het Nederlands.",
    en: "Write all text in English.",
    de: "Schreibe alle Texte auf Deutsch.",
    fr: "Écrivez tout le texte en français."
  };

  return `Je bent een historicus die gedetailleerde, accurate en boeiende tijdlijnen maakt over historische gebeurtenissen.

${langInstructions[language as keyof typeof langInstructions] || langInstructions.nl}

BELANGRIJKE INSTRUCTIES:
1. Genereer minimaal 30-50 gebeurtenissen voor een geboortedatum, of 50-100 voor een tijdsperiode
2. Verdeel de gebeurtenissen over verschillende categorieën (politiek, sport, entertainment, wetenschap, cultuur, etc.)
3. Zorg voor een goede mix van wereldwijde en lokale gebeurtenissen
4. Voeg ook culturele momenten toe: populaire muziek, films, tv-shows, boeken
5. Maak de beschrijvingen levendig en persoonlijk - alsof je het aan iemand vertelt
6. Voeg context toe die de gebeurtenis memorabel maakt
7. Voor elke gebeurtenis, geef een zoekterm (imageSearchQuery) die een relevante afbeelding zou vinden

KRITIEK - EVENTSCOPE VELD:
- Markeer elke gebeurtenis met het juiste eventScope:
  - "birthdate": gebeurtenissen die specifiek op de exacte geboortedag plaatsvonden
  - "birthmonth": gebeurtenissen die in de geboortemaand plaatsvonden
  - "birthyear": gebeurtenissen die in het geboortejaar plaatsvonden
  - "period": gebeurtenissen uit de bredere tijdsperiode

BEROEMDE JARIGEN:
- Zoek naar bekende personen (acteurs, muzikanten, sporters, politici, etc.) die op DEZELFDE DAG EN MAAND jarig zijn
- Voeg deze toe als events met category="celebrity" en isCelebrityBirthday=true
- Voeg ook een aparte famousBirthdays array toe met de belangrijkste beroemdheden

VOOR GEBOORTEDATUM:
- 55% van de gebeurtenissen: het geboortejaar (eventScope="birthyear")
- 15% van de gebeurtenissen: de geboortemaand (eventScope="birthmonth")  
- 30% van de gebeurtenissen: de specifieke geboortedag (eventScope="birthdate")
- Minstens 5 beroemde jarigen met dezelfde verjaardag

VOOR TIJDSPERIODE:
- Verdeel gebeurtenissen gelijkmatig over de jaren
- Focus op de belangrijkste momenten per jaar
- Voeg decennium-specifieke cultuur toe (mode, muziek, technologie)
- Gebruik eventScope="period" voor alle gebeurtenissen`;
}

function buildPrompt(data: TimelineRequest): string {
  let prompt = "";
  
  if (data.type === 'birthdate' && data.birthDate) {
    const { day, month, year } = data.birthDate;
    const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", 
                        "juli", "augustus", "september", "oktober", "november", "december"];
    const monthName = monthNames[month - 1];
    
    prompt = `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.

Genereer minimaal 50 gebeurtenissen:
- Minstens 25 gebeurtenissen over het jaar ${year} (politiek, cultuur, sport, wetenschap, entertainment) - markeer met eventScope="birthyear"
- Minstens 8 gebeurtenissen specifiek over ${monthName} ${year} - markeer met eventScope="birthmonth"
- Minstens 15 gebeurtenissen over de exacte dag ${day} ${monthName} ${year} - markeer met eventScope="birthdate"

BELANGRIJK - BEROEMDE JARIGEN:
Zoek naar minstens 5-10 bekende personen die ook op ${day} ${monthName} jarig zijn (niet per se hetzelfde jaar).
Dit kunnen zijn: acteurs, muzikanten, atleten, politici, wetenschappers, schrijvers, etc.
Voeg deze toe als aparte events met:
- category: "celebrity"
- isCelebrityBirthday: true
- eventScope: "birthdate"
EN voeg ze ook toe aan de famousBirthdays array.

Voeg toe:
- Nummer 1 hits in de hitparade rond die tijd
- Populaire films en tv-shows
- Belangrijke sportmomenten
- Politieke gebeurtenissen
- Wetenschappelijke doorbraken
- Culturele fenomenen`;
  } else if (data.type === 'range' && data.yearRange) {
    const { startYear, endYear } = data.yearRange;
    const yearSpan = endYear - startYear;
    
    prompt = `Maak een uitgebreide tijdlijn van ${startYear} tot ${endYear}.

Dit is een periode van ${yearSpan} jaar. Genereer minimaal ${Math.max(50, yearSpan * 5)} gebeurtenissen.
Markeer alle gebeurtenissen met eventScope="period".

Zorg voor een goede spreiding over alle jaren en verschillende categorieën:
- Belangrijke politieke gebeurtenissen
- Culturele mijlpalen (muziek, film, kunst)
- Sportmomenten
- Wetenschappelijke ontdekkingen
- Technologische innovaties
- Sociale veranderingen`;

    // If birthdate falls in range, highlight it
    if (data.birthDate) {
      const { day, month, year } = data.birthDate;
      if (year >= startYear && year <= endYear) {
        prompt += `\n\nBELANGRIJK: Het geboortejaar ${year} valt in deze periode. Besteed extra aandacht aan dit jaar (circa 20% van alle gebeurtenissen). Markeer gebeurtenissen uit dat jaar met eventScope="birthyear".`;
      }
    }
  }

  // Add optional context
  const { optionalData } = data;

  // Add person's name if provided
  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    prompt += `\n\nDe tijdlijn is voor: ${fullName}. Maak de beschrijvingen persoonlijk door soms de naam te noemen.`;
  }
  
  if (optionalData.focus) {
    const focusMap = {
      netherlands: "Focus vooral op Nederlandse gebeurtenissen en context.",
      europe: "Focus vooral op Europese gebeurtenissen en context.",
      world: "Focus op wereldwijde gebeurtenissen."
    };
    prompt += `\n\n${focusMap[optionalData.focus]}`;
  }

  if (optionalData.interests) {
    prompt += `\n\nDe persoon heeft interesse in: ${optionalData.interests}. Voeg extra gebeurtenissen toe die hierbij aansluiten.`;
  }

  if (optionalData.city) {
    prompt += `\n\nDe persoon woont in ${optionalData.city}. Voeg indien mogelijk lokale/regionale gebeurtenissen toe.`;
  }

  // Add children birthdays as personal events if they fall in the range
  if (optionalData.children && optionalData.children.length > 0) {
    const childrenInfo = optionalData.children
      .filter(c => c.name && c.birthDate?.year)
      .map(c => `${c.name} (geboren ${c.birthDate?.day}-${c.birthDate?.month}-${c.birthDate?.year})`);
    
    if (childrenInfo.length > 0) {
      prompt += `\n\nVoeg deze persoonlijke mijlpalen toe aan de tijdlijn: kinderen: ${childrenInfo.join(", ")}`;
    }
  }

  return prompt;
}
