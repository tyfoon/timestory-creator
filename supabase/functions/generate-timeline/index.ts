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
    periodType?: 'birthyear' | 'childhood' | 'puberty' | 'young-adult' | 'custom';
  };
  language: string;
  stream?: boolean;
  maxEvents?: number;
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

    const prompt = buildPrompt(requestData);
    console.log("Generated prompt (first 500 chars):", prompt.substring(0, 500));

    // Always use NDJSON streaming for speed
    if (requestData.stream) {
      return handleNDJSONStreaming(requestData, prompt, LOVABLE_API_KEY);
    }

    // Non-streaming fallback
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

/**
 * NDJSON Streaming: Uses message-based streaming to send each event as a complete JSON line
 * immediately when parsed, eliminating complex partial JSON parsing.
 */
async function handleNDJSONStreaming(
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
        { role: "system", content: getNDJSONSystemPrompt(requestData.language, requestData.maxEvents) },
        { role: "user", content: prompt },
      ],
    }),
  });

  if (!response.ok) {
    return handleErrorResponse(response);
  }

  const encoder = new TextEncoder();
  const decoder = new TextDecoder();
  
  let buffer = "";
  let contentBuffer = "";
  let isStreamClosed = false;
  let eventCount = 0;
  let sentSummary = false;
  let sentFamousBirthdays = false;
  const allEvents: any[] = [];
  let summary = "";
  let famousBirthdays: any[] = [];

  const safeEnqueue = (controller: ReadableStreamDefaultController, data: string) => {
    if (isStreamClosed) return;
    try {
      controller.enqueue(encoder.encode(data));
    } catch (e) {
      console.error('Enqueue error:', e);
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
              continue;
            }
            
            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices?.[0]?.delta;
              
              if (delta?.content) {
                contentBuffer += delta.content;
                
                // Process complete NDJSON lines
                const ndjsonLines = contentBuffer.split('\n');
                contentBuffer = ndjsonLines.pop() || "";
                
                for (const ndjsonLine of ndjsonLines) {
                  const trimmed = ndjsonLine.trim();
                  if (!trimmed) continue;
                  
                  try {
                    const obj = JSON.parse(trimmed);
                    
                    if (obj.type === 'event' && obj.data) {
                      eventCount++;
                      allEvents.push(obj.data);
                      safeEnqueue(controller, `data: ${JSON.stringify({ type: 'event', event: obj.data })}\n\n`);
                      console.log(`Streamed event ${eventCount}: ${obj.data.title?.substring(0, 40)}`);
                    } else if (obj.type === 'summary' && obj.data && !sentSummary) {
                      summary = obj.data;
                      safeEnqueue(controller, `data: ${JSON.stringify({ type: 'summary', summary: obj.data })}\n\n`);
                      sentSummary = true;
                    } else if (obj.type === 'famousBirthdays' && obj.data && !sentFamousBirthdays) {
                      famousBirthdays = obj.data;
                      safeEnqueue(controller, `data: ${JSON.stringify({ type: 'famousBirthdays', famousBirthdays: obj.data })}\n\n`);
                      sentFamousBirthdays = true;
                    }
                  } catch {
                    // Not valid JSON line yet, ignore
                  }
                }
              }
            } catch {
              // Ignore SSE parse errors
            }
          }
        }
        
        // Process any remaining content in buffer
        if (contentBuffer.trim()) {
          const remainingLines = contentBuffer.split('\n');
          for (const ndjsonLine of remainingLines) {
            const trimmed = ndjsonLine.trim();
            if (!trimmed) continue;
            
            try {
              const obj = JSON.parse(trimmed);
              
              if (obj.type === 'event' && obj.data) {
                eventCount++;
                allEvents.push(obj.data);
                safeEnqueue(controller, `data: ${JSON.stringify({ type: 'event', event: obj.data })}\n\n`);
              } else if (obj.type === 'summary' && obj.data && !sentSummary) {
                summary = obj.data;
                safeEnqueue(controller, `data: ${JSON.stringify({ type: 'summary', summary: obj.data })}\n\n`);
                sentSummary = true;
              } else if (obj.type === 'famousBirthdays' && obj.data && !sentFamousBirthdays) {
                famousBirthdays = obj.data;
                safeEnqueue(controller, `data: ${JSON.stringify({ type: 'famousBirthdays', famousBirthdays: obj.data })}\n\n`);
                sentFamousBirthdays = true;
              }
            } catch {
              // Ignore
            }
          }
        }
        
        // Send complete message with all collected data
        console.log(`Stream complete: ${eventCount} events, summary: ${!!summary}, birthdays: ${famousBirthdays.length}`);
        safeEnqueue(controller, `data: ${JSON.stringify({ 
          type: 'complete', 
          data: { 
            events: allEvents, 
            summary: summary || "Een overzicht van belangrijke gebeurtenissen uit deze periode.",
            famousBirthdays 
          } 
        })}\n\n`);
        
        safeEnqueue(controller, 'data: [DONE]\n\n');
        
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
                imageSearchQuery: { type: "string", description: "Search query in the user's language to find a relevant image for this event" },
                imageSearchQueryEn: { type: "string", description: "English search query for finding images on Wikimedia Commons (translated from imageSearchQuery)" },
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

/**
 * NDJSON System Prompt: Instructs AI to output one JSON object per line
 * for immediate streaming to the client.
 */
function getNDJSONSystemPrompt(language: string, maxEvents?: number): string {
  const langInstructions = {
    nl: "Schrijf alle tekst in het Nederlands.",
    en: "Write all text in English.",
    de: "Schreibe alle Texte auf Deutsch.",
    fr: "Écrivez tout le texte en français."
  };

  const isShort = maxEvents && maxEvents <= 20;
  const eventCount = isShort ? maxEvents : 50;

  return `Je bent een historicus die boeiende tijdlijnen maakt.

${langInstructions[language as keyof typeof langInstructions] || langInstructions.nl}

KRITISCH - OUTPUT FORMAAT (NDJSON):
Je MOET je output formatteren als NDJSON (Newline Delimited JSON).
Stuur ELKE gebeurtenis als een apart JSON-object op een NIEUWE regel.
Begin ONMIDDELLIJK met het eerste event - geen inleiding, geen markdown.

FORMAT PER REGEL:
{"type":"event","data":{"id":"evt_1","date":"1973-03-28","year":1973,"month":3,"day":28,"title":"Titel hier","description":"Beschrijving hier","category":"politics","imageSearchQuery":"Nederlandse zoekterm","imageSearchQueryEn":"English search term for Wikimedia","importance":"high","eventScope":"birthyear"}}
{"type":"event","data":{"id":"evt_2","date":"1973-03","year":1973,"month":3,"title":"Nog een event","description":"...","category":"music","imageSearchQuery":"...","imageSearchQueryEn":"...","importance":"medium","eventScope":"birthmonth"}}

NA ALLE EVENTS, stuur op aparte regels:
{"type":"summary","data":"Een samenvatting van de periode..."}
{"type":"famousBirthdays","data":[{"name":"Persoon","profession":"Beroep","birthYear":1950,"imageSearchQuery":"persoon naam portret"}]}

REGELS:
1. GEEN markdown, GEEN code blocks, ALLEEN JSON regels
2. Elke regel is een compleet, geldig JSON object
3. Begin DIRECT met het eerste {"type":"event",...} - geen tekst ervoor
4. Genereer ${eventCount} events
5. Stuur summary en famousBirthdays als laatste regels

CATEGORIEËN: politics, sports, entertainment, science, culture, world, local, personal, music, technology, celebrity

EVENTSCOPE WAARDES:
- "birthdate": exact op de geboortedag
- "birthmonth": in de geboortemaand
- "birthyear": in het geboortejaar
- "period": in de bredere periode

KWALITEIT:
- Maak beschrijvingen levendig en persoonlijk
- Voeg context toe die de gebeurtenis memorabel maakt
- Zorg voor een mix van categorieën

AFBEELDING ZOEKTERMEN (BELANGRIJK):
- imageSearchQuery: zoekterm in de taal van de gebruiker (${language})
- imageSearchQueryEn: ALTIJD een Engelse vertaling van de zoekterm, specifiek voor Wikimedia Commons
  - Gebruik exacte namen van personen, evenementen, plaatsen in het Engels
  - Voeg het jaar toe voor historische context
  - Voorbeeld: "Queen Beatrix inauguration 1980 Amsterdam" of "Elvis Presley concert 1977"`;
}

function getSystemPrompt(language: string, maxEvents?: number): string {
  const langInstructions = {
    nl: "Schrijf alle tekst in het Nederlands.",
    en: "Write all text in English.",
    de: "Schreibe alle Texte auf Deutsch.",
    fr: "Écrivez tout le texte en français."
  };

  const isShort = maxEvents && maxEvents <= 20;

  return `Je bent een historicus die gedetailleerde, accurate en boeiende tijdlijnen maakt over historische gebeurtenissen.

${langInstructions[language as keyof typeof langInstructions] || langInstructions.nl}

BELANGRIJKE INSTRUCTIES:
1. Genereer ${isShort ? 'maximaal 20' : 'minimaal 30-50'} gebeurtenissen voor een geboortedatum, of ${isShort ? 'maximaal 20' : '50-100'} voor een tijdsperiode
2. Verdeel de gebeurtenissen over verschillende categorieën (politiek, sport, entertainment, wetenschap, cultuur, etc.)
3. Zorg voor een goede mix van wereldwijde en lokale gebeurtenissen
4. Voeg ook culturele momenten toe: populaire muziek, films, tv-shows, boeken
5. Maak de beschrijvingen levendig en persoonlijk - alsof je het aan iemand vertelt
6. Voeg context toe die de gebeurtenis memorabel maakt
7. Voor elke gebeurtenis, geef TWEE zoektermen:
   - imageSearchQuery: in de taal van de gebruiker
   - imageSearchQueryEn: ALTIJD in het Engels voor Wikimedia Commons (met exacte namen en jaar)

KRITIEK - EVENTSCOPE VELD:
- Markeer elke gebeurtenis met het juiste eventScope:
  - "birthdate": gebeurtenissen die specifiek op de exacte geboortedag plaatsvonden
  - "birthmonth": gebeurtenissen die in de geboortemaand plaatsvonden
  - "birthyear": gebeurtenissen die in het geboortejaar plaatsvonden
  - "period": gebeurtenissen uit de bredere tijdsperiode

BEROEMDE JARIGEN:
- Zoek naar bekende personen (acteurs, muzikanten, sporters, politici, etc.) die op DEZELFDE DAG EN MAAND jarig zijn
- Voeg deze toe als events met category="celebrity" en isCelebrityBirthday=true
- Voeg ook een aparte famousBirthdays array toe met de belangrijkste beroemdheden`;
}

function buildPrompt(data: TimelineRequest): string {
  let prompt = "";
  const isShort = data.maxEvents && data.maxEvents <= 20;
  const periodType = data.optionalData?.periodType;
  
  // Get content focus based on period type
  const contentFocus = getContentFocusForPeriod(periodType);
  
  if (data.type === 'birthdate' && data.birthDate) {
    const { day, month, year } = data.birthDate;
    const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", 
                        "juli", "augustus", "september", "oktober", "november", "december"];
    const monthName = monthNames[month - 1];
    
    if (isShort) {
      prompt = `Maak een KORTE tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.

Genereer PRECIES ${data.maxEvents} events in NDJSON formaat.
Verdeling:
- 10 gebeurtenissen over het jaar ${year} (eventScope="birthyear")
- 3 gebeurtenissen over ${monthName} ${year} (eventScope="birthmonth")
- 5 gebeurtenissen over ${day} ${monthName} ${year} (eventScope="birthdate")
- 2 beroemde jarigen die ook op ${day} ${monthName} jarig zijn (category="celebrity", isCelebrityBirthday=true)

${contentFocus}`;
    } else {
      prompt = `Maak een uitgebreide tijdlijn voor iemand geboren op ${day} ${monthName} ${year}.

Genereer minimaal 50 events in NDJSON formaat:
- 25+ over ${year} (eventScope="birthyear")
- 8+ over ${monthName} ${year} (eventScope="birthmonth")
- 15+ over ${day} ${monthName} ${year} (eventScope="birthdate")
- 5-10 beroemde jarigen op ${day} ${monthName} (category="celebrity", isCelebrityBirthday=true)

${contentFocus}`;
    }
  } else if (data.type === 'range' && data.yearRange) {
    const { startYear, endYear } = data.yearRange;
    const yearSpan = endYear - startYear;
    const targetEvents = isShort ? data.maxEvents : Math.max(50, yearSpan * 5);
    
    prompt = `Maak een ${isShort ? 'KORTE' : 'uitgebreide'} tijdlijn van ${startYear} tot ${endYear}.

Genereer ${isShort ? 'PRECIES' : 'minimaal'} ${targetEvents} events in NDJSON formaat.
Alle events krijgen eventScope="period".

${isShort ? 'Selecteer alleen de meest iconische momenten.' : 'Zorg voor goede spreiding over alle jaren.'}

${contentFocus}`;

    // Always add famous birthdays for the user's birthday
    if (data.birthDate) {
      const { day, month, year } = data.birthDate;
      const monthNames = ["januari", "februari", "maart", "april", "mei", "juni", 
                          "juli", "augustus", "september", "oktober", "november", "december"];
      const monthName = monthNames[month - 1];
      
      prompt += `

BELANGRIJK - BEROEMDE JARIGEN:
Voeg 3-5 beroemde personen toe die op ${day} ${monthName} jarig zijn (category="celebrity", isCelebrityBirthday=true).
Deze personen hoeven NIET in de tijdsperiode ${startYear}-${endYear} geboren te zijn, maar moeten wel op dezelfde dag en maand jarig zijn.`;
      
      if (year >= startYear && year <= endYear) {
        prompt += `\n\nHet geboortejaar ${year} valt in deze periode. Besteed extra aandacht hieraan (eventScope="birthyear" voor dat jaar).`;
      }
    }
  }

  const { optionalData } = data;

  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    prompt += `\n\nTijdlijn voor: ${fullName}. Maak beschrijvingen persoonlijk.`;
  }
  
  if (optionalData.focus) {
    const focusMap = {
      netherlands: "Geografische focus: Nederlandse gebeurtenissen.",
      europe: "Geografische focus: Europese gebeurtenissen.",
      world: "Geografische focus: wereldwijde gebeurtenissen."
    };
    prompt += `\n\n${focusMap[optionalData.focus]}`;
  }

  if (optionalData.interests) {
    prompt += `\n\nInteresses: ${optionalData.interests}. Voeg relevante gebeurtenissen toe.`;
  }

  if (optionalData.city) {
    prompt += `\n\nWoonplaats: ${optionalData.city}. Voeg lokale gebeurtenissen toe indien mogelijk.`;
  }

  if (optionalData.children && optionalData.children.length > 0) {
    const childrenInfo = optionalData.children
      .filter(c => c.name && c.birthDate?.year)
      .map(c => `${c.name} (${c.birthDate?.day}-${c.birthDate?.month}-${c.birthDate?.year})`);
    
    if (childrenInfo.length > 0) {
      prompt += `\n\nPersoonlijke mijlpalen - kinderen: ${childrenInfo.join(", ")}`;
    }
  }

  return prompt;
}

/**
 * Returns content focus instructions based on the selected period type.
 */
function getContentFocusForPeriod(periodType?: string): string {
  switch (periodType) {
    case 'birthyear':
      return `CONTENT FOCUS - GEBOORTEJAAR:
Focus op een brede mix van alles wat er dat jaar gebeurde:
- Nummer 1 hits en populaire muziek
- Belangrijke nieuws en politieke gebeurtenissen  
- Iconische films en tv-shows
- Sportmomenten en kampioenschappen
- Technologische ontwikkelingen
- Culturele gebeurtenissen

BEROEMDE JARIGEN: Voeg bekende mensen toe die op dezelfde dag en maand jarig zijn (acteurs, muzikanten, sporters, politici, etc.)`;

    case 'childhood':
      return `CONTENT FOCUS - JEUGD (6-10 jaar):
Focus op zaken die een kind tussen 6-10 jaar zou herinneren en leuk vinden:
- SPEELGOED: Populair speelgoed, actiefiguren, poppen, bordspellen, buitenspeelgoed
- TV-PROGRAMMA'S: Kinderseries, tekenfilms, jeugdprogramma's, zaterdagochtend cartoons
- FILMS: Kinderfilms, Disney, animatiefilms
- BOEKEN: Populaire kinderboeken, stripboeken
- SNOEP & ETEN: Populaire snacks, snoepjes, ontbijtgranen voor kinderen
- GROTE WERELDGEBEURTENISSEN: Alleen de allergrootste gebeurtenissen die ook een kind zou opvallen (rampen, koningshuis, grote sportevenementen)

BEROEMDE JARIGEN: Voeg bekende mensen toe die op dezelfde dag en maand jarig zijn.`;

    case 'puberty':
      return `CONTENT FOCUS - PUBERTIJD (11-17 jaar):
Focus op zaken die relevant zijn voor tieners:
- MUZIEK: Populaire artiesten, bands, muziekstromingen, eerste concerten, hitlijsten
- UITGAAN: Disco's, clubs, feesten, festivals die populair waren
- FILMS: Tienerfilms, bioscoophits, cultfilms
- GAMES & GADGETS: Gameboys, spelcomputers, walkmans, discmans, eerste computers, nieuwe technologie
- TV & ENTERTAINMENT: Populaire series, MTV, muziekprogramma's
- MODE: Kledingtrends, kapseltrends
- WERELDGEBEURTENISSEN: Belangrijke politieke en sociale gebeurtenissen

BEROEMDE JARIGEN: Voeg bekende mensen toe die op dezelfde dag en maand jarig zijn.`;

    case 'young-adult':
      return `CONTENT FOCUS - JONG VOLWASSEN (18-25 jaar):
Focus op zaken die relevant zijn voor jong volwassenen:
- MUZIEK: Populaire artiesten, bands, festivals, concerten, muziektrends
- UITGAAN: Clubs, festivals, nachtleven, populaire uitgaansgelegenheden
- FILMS: Grote bioscoopfilms, cultfilms, filmgenres die populair waren
- GADGETS & TECHNOLOGIE: Computers, mobiele telefoons, internet, mp3-spelers, iPods, nieuwe technologie
- GAMES: Spelcomputers, populaire games, online gaming
- POLITIEK: Verkiezingen, regeringen, politieke gebeurtenissen, sociale bewegingen
- WERELDGEBEURTENISSEN: Oorlogen, crises, grote nieuwsgebeurtenissen
- ECONOMIE: Economische trends, werkgelegenheid, huizenmarkt

BEROEMDE JARIGEN: Voeg bekende mensen toe die op dezelfde dag en maand jarig zijn.`;

    case 'custom':
    default:
      return `CONTENT FOCUS - BREDE MIX:
Zorg voor een gevarieerde mix van alle categorieën:
- Politiek en wereldnieuws
- Muziek en entertainment  
- Films en tv-shows
- Sport
- Technologie en gadgets
- Wetenschap en ontdekkingen
- Cultuur en maatschappij
- Mode en trends

BEROEMDE JARIGEN: Voeg bekende mensen toe die op dezelfde dag en maand jarig zijn.`;
  }
}
