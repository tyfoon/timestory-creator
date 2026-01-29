import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  getNDJSONSystemPrompt,
  getSystemPrompt,
  getContentFocusForPeriod,
  MONTH_NAMES,
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
} from "../_shared/prompts.ts";

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
                isCelebrityBirthday: { type: "boolean", description: "True if this is about a famous person born on the same date" },
                spotifySearchQuery: { type: "string", description: "Search query for a relevant song/hit from that time, e.g. 'artist - title'. Fill this for music events (category=music) or important cultural moments with a #1 hit of that moment." },
                movieSearchQuery: { type: "string", description: "Search query for YouTube to find a movie trailer, e.g. 'Titanic trailer 1997'. Fill this for movie/film events (isMovie=true)." }
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

function buildPrompt(data: TimelineRequest): string {
  let prompt = "";
  const isShort = data.maxEvents && data.maxEvents <= 20;
  const periodType = data.optionalData?.periodType;
  
  // Get content focus based on period type
  const contentFocus = getContentFocusForPeriod(periodType);
  
  if (data.type === 'birthdate' && data.birthDate) {
    const { day, month, year } = data.birthDate;
    const monthName = MONTH_NAMES[month - 1];
    
    if (isShort) {
      prompt = BIRTHDATE_PROMPT_SHORT(day, monthName, year, data.maxEvents!, contentFocus);
    } else {
      prompt = BIRTHDATE_PROMPT_FULL(day, monthName, year, contentFocus);
    }
  } else if (data.type === 'range' && data.yearRange) {
    const { startYear, endYear } = data.yearRange;
    const yearSpan = endYear - startYear;
    const targetEvents = isShort ? data.maxEvents! : Math.max(50, yearSpan * 5);
    
    prompt = RANGE_PROMPT(startYear, endYear, isShort || false, targetEvents, contentFocus);

    // Always add famous birthdays for the user's birthday
    if (data.birthDate) {
      const { day, month, year } = data.birthDate;
      const monthName = MONTH_NAMES[month - 1];
      
      prompt += FAMOUS_BIRTHDAYS_ADDITION(day, monthName, startYear, endYear);
      
      if (year >= startYear && year <= endYear) {
        prompt += BIRTHYEAR_IN_RANGE_ADDITION(year);
      }
    }
  }

  const { optionalData } = data;

  if (optionalData.firstName || optionalData.lastName) {
    const fullName = [optionalData.firstName, optionalData.lastName].filter(Boolean).join(' ');
    prompt += PERSONAL_NAME_ADDITION(fullName);
  }
  
  if (optionalData.focus) {
    prompt += GEOGRAPHIC_FOCUS[optionalData.focus];
  }

  if (optionalData.interests) {
    prompt += INTERESTS_ADDITION(optionalData.interests);
  }

  if (optionalData.city) {
    prompt += CITY_ADDITION(optionalData.city);
  }

  if (optionalData.children && optionalData.children.length > 0) {
    const childrenInfo = optionalData.children
      .filter(c => c.name && c.birthDate?.year)
      .map(c => `${c.name} (${c.birthDate?.day}-${c.birthDate?.month}-${c.birthDate?.year})`);
    
    if (childrenInfo.length > 0) {
      prompt += CHILDREN_ADDITION(childrenInfo);
    }
  }

  return prompt;
}
