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
  stream?: boolean;
  maxEvents?: number; // For short version (20 items)
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
    console.log("Generated prompt (first 500 chars):", prompt.substring(0, 500));

    // If streaming is requested, use streaming response
    if (requestData.stream) {
      return handleStreamingResponse(requestData, prompt, LOVABLE_API_KEY);
    }

    // Non-streaming: original behavior
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: getSystemPrompt(requestData.language, requestData.maxEvents) },
          { role: "user", content: prompt },
        ],
        tools: [getTimelineTool()],
        tool_choice: { type: "function", function: { name: "create_timeline" } }
      }),
    });

    if (!response.ok) {
      return handleErrorResponse(response);
    }

    const aiResponse = await response.json();
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall || toolCall.function.name !== "create_timeline") {
      throw new Error("Invalid AI response - no timeline data");
    }

    const timelineData = JSON.parse(toolCall.function.arguments);
    console.log(`Generated ${timelineData.events?.length || 0} events`);

    return new Response(
      JSON.stringify({ success: true, data: timelineData }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error generating timeline:", error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function handleStreamingResponse(
  requestData: TimelineRequest,
  prompt: string,
  apiKey: string
): Promise<Response> {
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      stream: true,
      messages: [
        { role: "system", content: getSystemPrompt(requestData.language, requestData.maxEvents) },
        { role: "user", content: prompt },
      ],
      tools: [getTimelineTool()],
      tool_choice: { type: "function", function: { name: "create_timeline" } }
    }),
  });

  if (!response.ok) {
    return handleErrorResponse(response);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  let functionArguments = "";
  let lastSentEventCount = 0;
  let sentSummary = false;
  let sentFamousBirthdays = false;
  let sentComplete = false;
  let buffer = "";
  let isStreamClosed = false;

  // Safe enqueue helper that checks if stream is still open
  const safeEnqueue = (controller: ReadableStreamDefaultController, data: string) => {
    if (isStreamClosed) return;
    try {
      controller.enqueue(encoder.encode(data));
    } catch (e) {
      console.error('Enqueue error (stream likely closed):', e);
      isStreamClosed = true;
    }
  };

  const readable = new ReadableStream({
    async start(controller) {
      const reader = response.body!.getReader();
      
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || "";
          
          for (const line of lines) {
            if (isStreamClosed) break;
            if (!line.startsWith('data: ')) continue;
            const data = line.slice(6).trim();
            
            if (data === '[DONE]') {
              // Send final complete message
              if (!sentComplete) {
                try {
                  const finalData = JSON.parse(functionArguments);
                  safeEnqueue(controller, `data: ${JSON.stringify({ 
                    type: 'complete', 
                    data: finalData 
                  })}\n\n`);
                  sentComplete = true;
                } catch (e) {
                  console.error('Error parsing final data:', e);
                  // Try to send what we have
                  const partialData = tryParsePartialTimeline(functionArguments);
                  if (partialData) {
                    safeEnqueue(controller, `data: ${JSON.stringify({ 
                      type: 'complete', 
                      data: partialData 
                    })}\n\n`);
                    sentComplete = true;
                  }
                }
              }
              safeEnqueue(controller, 'data: [DONE]\n\n');
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.tool_calls?.[0]?.function?.arguments) {
                functionArguments += delta.tool_calls[0].function.arguments;
                
                // Try to extract complete events from the partial JSON
                const partialData = tryParsePartialTimeline(functionArguments);
                
                if (partialData) {
                  // Send new events incrementally
                  if (partialData.events && partialData.events.length > lastSentEventCount) {
                    const newEvents = partialData.events.slice(lastSentEventCount);
                    for (const event of newEvents) {
                      safeEnqueue(controller, `data: ${JSON.stringify({ 
                        type: 'event', 
                        event 
                      })}\n\n`);
                    }
                    lastSentEventCount = partialData.events.length;
                  }
                  
                  // Send summary once available
                  if (partialData.summary && !sentSummary) {
                    safeEnqueue(controller, `data: ${JSON.stringify({ 
                      type: 'summary', 
                      summary: partialData.summary 
                    })}\n\n`);
                    sentSummary = true;
                  }
                  
                  // Send famous birthdays once available
                  if (partialData.famousBirthdays && partialData.famousBirthdays.length > 0 && !sentFamousBirthdays) {
                    safeEnqueue(controller, `data: ${JSON.stringify({ 
                      type: 'famousBirthdays', 
                      famousBirthdays: partialData.famousBirthdays 
                    })}\n\n`);
                    sentFamousBirthdays = true;
                  }
                }
              }
            } catch (e) {
              // Ignore parse errors for incomplete chunks
            }
          }
        }
        
        // Process any remaining buffer
        if (buffer.trim() && !isStreamClosed) {
          if (buffer.startsWith('data: ')) {
            const data = buffer.slice(6).trim();
            if (data !== '[DONE]') {
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta;
                if (delta?.tool_calls?.[0]?.function?.arguments) {
                  functionArguments += delta.tool_calls[0].function.arguments;
                }
              } catch (e) {
                // Ignore
              }
            }
          }
        }
        
        // Final flush - make sure we send complete data
        if (!isStreamClosed && (!sentComplete || lastSentEventCount === 0)) {
          const finalData = tryParsePartialTimeline(functionArguments);
          if (finalData) {
            if (finalData.events && finalData.events.length > lastSentEventCount) {
              const newEvents = finalData.events.slice(lastSentEventCount);
              for (const event of newEvents) {
                safeEnqueue(controller, `data: ${JSON.stringify({ 
                  type: 'event', 
                  event 
                })}\n\n`);
              }
            }
            if (finalData.summary && !sentSummary) {
              safeEnqueue(controller, `data: ${JSON.stringify({ 
                type: 'summary', 
                summary: finalData.summary 
              })}\n\n`);
            }
            if (finalData.famousBirthdays && !sentFamousBirthdays) {
              safeEnqueue(controller, `data: ${JSON.stringify({ 
                type: 'famousBirthdays', 
                famousBirthdays: finalData.famousBirthdays 
              })}\n\n`);
            }
            if (!sentComplete) {
              safeEnqueue(controller, `data: ${JSON.stringify({ 
                type: 'complete', 
                data: finalData 
              })}\n\n`);
            }
          }
        }
        
        if (!isStreamClosed) {
          isStreamClosed = true;
          controller.close();
        }
      } catch (e) {
        console.error('Stream error:', e);
        if (!isStreamClosed) {
          isStreamClosed = true;
          controller.error(e);
        }
      }
    }
  });

  return new Response(readable, {
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    }
  });
}

function tryParsePartialTimeline(partial: string): { events?: any[]; summary?: string; famousBirthdays?: any[] } | null {
  // Try to extract complete events array from partial JSON
  // The AI generates: {"events":[{...},{...}],"summary":"...","famousBirthdays":[...]}
  
  try {
    // First try full parse
    return JSON.parse(partial);
  } catch {
    // Try to extract events array
    const eventsMatch = partial.match(/"events"\s*:\s*\[/);
    if (!eventsMatch) return null;
    
    const eventsStart = eventsMatch.index! + eventsMatch[0].length - 1;
    let bracketCount = 0;
    let inString = false;
    let escape = false;
    let lastCompleteEvent = -1;
    
    const events: any[] = [];
    let currentEventStart = -1;
    
    for (let i = eventsStart; i < partial.length; i++) {
      const char = partial[i];
      
      if (escape) {
        escape = false;
        continue;
      }
      
      if (char === '\\') {
        escape = true;
        continue;
      }
      
      if (char === '"' && !escape) {
        inString = !inString;
        continue;
      }
      
      if (inString) continue;
      
      if (char === '[' || char === '{') {
        if (bracketCount === 1 && char === '{') {
          currentEventStart = i;
        }
        bracketCount++;
      } else if (char === ']' || char === '}') {
        bracketCount--;
        if (bracketCount === 1 && char === '}' && currentEventStart !== -1) {
          // Complete event object
          try {
            const eventStr = partial.substring(currentEventStart, i + 1);
            const event = JSON.parse(eventStr);
            events.push(event);
            lastCompleteEvent = i;
          } catch {
            // Incomplete event, ignore
          }
          currentEventStart = -1;
        }
      }
    }
    
    // Try to extract summary
    let summary: string | undefined;
    const summaryMatch = partial.match(/"summary"\s*:\s*"([^"]+)"/);
    if (summaryMatch) {
      summary = summaryMatch[1];
    }
    
    // Try to extract famousBirthdays
    let famousBirthdays: any[] | undefined;
    const fbMatch = partial.match(/"famousBirthdays"\s*:\s*\[([^\]]*)\]/);
    if (fbMatch) {
      try {
        famousBirthdays = JSON.parse(`[${fbMatch[1]}]`);
      } catch {
        // Incomplete array
      }
    }
    
    if (events.length > 0 || summary || famousBirthdays) {
      return { events: events.length > 0 ? events : undefined, summary, famousBirthdays };
    }
    
    return null;
  }
}

async function handleErrorResponse(response: Response): Promise<Response> {
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

function getTimelineTool() {
  return {
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
  };
}

function getSystemPrompt(language: string, maxEvents?: number): string {
  const langInstructions = {
    nl: "Schrijf alle tekst in het Nederlands.",
    en: "Write all text in English.",
    de: "Schreibe alle Texte auf Deutsch.",
    fr: "Écrivez tout le texte en français."
  };

  const isShort = maxEvents && maxEvents <= 20;
  const eventCount = isShort ? "15-20" : "30-50";
  const rangeEventCount = isShort ? "15-20" : "50-100";

  return `Je bent een historicus die gedetailleerde, accurate en boeiende tijdlijnen maakt over historische gebeurtenissen.

${langInstructions[language as keyof typeof langInstructions] || langInstructions.nl}

BELANGRIJKE INSTRUCTIES:
1. Genereer ${isShort ? 'maximaal 20' : 'minimaal 30-50'} gebeurtenissen voor een geboortedatum, of ${isShort ? 'maximaal 20' : '50-100'} voor een tijdsperiode
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
${isShort ? `- Selecteer de ${maxEvents} meest interessante en iconische gebeurtenissen
- Verdeel over: 50% geboortejaar, 20% geboortemaand, 30% exacte geboortedag
- Minstens 2-3 beroemde jarigen` : `- 55% van de gebeurtenissen: het geboortejaar (eventScope="birthyear")
- 15% van de gebeurtenissen: de geboortemaand (eventScope="birthmonth")  
- 30% van de gebeurtenissen: de specifieke geboortedag (eventScope="birthdate")
- Minstens 5 beroemde jarigen met dezelfde verjaardag`}

VOOR TIJDSPERIODE:
- Verdeel gebeurtenissen gelijkmatig over de jaren
- Focus op de belangrijkste momenten per jaar
- Voeg decennium-specifieke cultuur toe (mode, muziek, technologie)
- Gebruik eventScope="period" voor alle gebeurtenissen`;
}

function buildPrompt(data: TimelineRequest): string {
  let prompt = "";
  const isShort = data.maxEvents && data.maxEvents <= 20;
  
  if (data.type === 'birthdate' && data.birthDate) {
    const { day, month, year } = data.birthDate;
    const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", 
                        "juli", "augustus", "september", "oktober", "november", "december"];
    const monthName = monthNames[month - 1];
    
    if (isShort) {
      prompt = `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.

Genereer PRECIES ${data.maxEvents} gebeurtenissen - niet meer, niet minder.
Selecteer alleen de meest iconische en memorabele momenten:
- 10 gebeurtenissen over het jaar ${year} - markeer met eventScope="birthyear"
- 3 gebeurtenissen specifiek over ${monthName} ${year} - markeer met eventScope="birthmonth"
- 5 gebeurtenissen over de exacte dag ${day} ${monthName} ${year} - markeer met eventScope="birthdate"
- 2 beroemde personen die ook op ${day} ${monthName} jarig zijn

Focus op:
- De #1 hit van die dag/week
- De belangrijkste nieuwsgebeurtenissen
- Iconische films of tv-shows
- Belangrijke sportmomenten`;
    } else {
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
    }
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

    if (data.birthDate) {
      const { day, month, year } = data.birthDate;
      if (year >= startYear && year <= endYear) {
        prompt += `\n\nBELANGRIJK: Het geboortejaar ${year} valt in deze periode. Besteed extra aandacht aan dit jaar (circa 20% van alle gebeurtenissen). Markeer gebeurtenissen uit dat jaar met eventScope="birthyear".`;
      }
    }
  }

  const { optionalData } = data;

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
