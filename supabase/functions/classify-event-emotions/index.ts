/**
 * classify-event-emotions
 *
 * Single Lovable AI call that, given the intro text + all timeline events,
 * returns one emotion label per segment along with an ElevenLabs audio tag
 * (e.g. "[warm]", "[sad]", "[excited]") and tuned voice_settings.
 *
 * Used by the Spoken Story flow to make ElevenLabs narration more emotive.
 *
 * Input:
 *   {
 *     language: 'nl' | 'en' | 'de' | 'fr',
 *     intro?: string,
 *     events: { id: string, title: string, description: string, year?: number }[]
 *   }
 *
 * Output:
 *   {
 *     intro?:  ClassifiedSegment,
 *     events: Record<string, ClassifiedSegment>
 *   }
 *
 * ClassifiedSegment = {
 *   emotion: 'warm'|'nostalgic'|'sad'|'excited'|'proud'|'tender'|'reflective'|'playful'|'serious'|'neutral',
 *   intensity: 'low' | 'medium' | 'high',
 *   audioTag: string,           // e.g. "[warm][softly]" — ready to prefix
 *   voiceSettings: {
 *     stability: number,        // 0..1
 *     similarityBoost: number,  // 0..1
 *     style: number             // 0..1
 *   }
 * }
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const SYSTEM_PROMPT = `You label short biographical timeline moments with the emotion that should color a spoken narration of that moment.
Pick exactly ONE emotion per segment from this set:
warm, nostalgic, sad, excited, proud, tender, reflective, playful, serious, neutral.
Pick intensity: low | medium | high.
Then return the corresponding ElevenLabs audio tag and ElevenLabs voice_settings tuned for Multilingual v2.
Be conservative — most everyday memories are "nostalgic" or "warm" (medium). Only use "sad" for clear loss/grief, "excited" for genuine peak joy, "proud" for milestones (birth, marriage, graduation), "playful" for childhood/humor, "serious" for heavy/grave themes.`;

const TOOL = {
  type: 'function',
  function: {
    name: 'classify_segments',
    description: 'Return an emotion label, audio tag and voice settings for each segment.',
    parameters: {
      type: 'object',
      properties: {
        intro: { $ref: '#/$defs/seg' },
        events: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              segment: { $ref: '#/$defs/seg' },
            },
            required: ['id', 'segment'],
            additionalProperties: false,
          },
        },
      },
      required: ['events'],
      additionalProperties: false,
      $defs: {
        seg: {
          type: 'object',
          properties: {
            emotion: {
              type: 'string',
              enum: [
                'warm', 'nostalgic', 'sad', 'excited', 'proud',
                'tender', 'reflective', 'playful', 'serious', 'neutral',
              ],
            },
            intensity: { type: 'string', enum: ['low', 'medium', 'high'] },
            audioTag: { type: 'string' },
            voiceSettings: {
              type: 'object',
              properties: {
                stability: { type: 'number' },
                similarityBoost: { type: 'number' },
                style: { type: 'number' },
              },
              required: ['stability', 'similarityBoost', 'style'],
              additionalProperties: false,
            },
          },
          required: ['emotion', 'intensity', 'audioTag', 'voiceSettings'],
          additionalProperties: false,
        },
      },
    },
  },
};

interface InEvent { id: string; title: string; description: string; year?: number }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'LOVABLE_API_KEY not configured' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { language = 'nl', intro, events } = await req.json() as {
      language?: string; intro?: string; events: InEvent[];
    };

    if (!Array.isArray(events) || events.length === 0) {
      return new Response(JSON.stringify({ error: 'events[] required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userPayload = {
      language,
      intro: intro ? { text: intro } : null,
      events: events.map(e => ({
        id: e.id,
        year: e.year,
        title: e.title,
        description: e.description,
      })),
    };

    const aiResp = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash-lite',
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: JSON.stringify(userPayload) },
        ],
        tools: [TOOL],
        tool_choice: { type: 'function', function: { name: 'classify_segments' } },
      }),
    });

    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error('Lovable AI error', aiResp.status, t);
      if (aiResp.status === 429 || aiResp.status === 402) {
        return new Response(JSON.stringify({ error: 'rate-limited-or-credits' }), {
          status: aiResp.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      return new Response(JSON.stringify({ error: 'AI gateway error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const json = await aiResp.json();
    const toolCall = json?.choices?.[0]?.message?.tool_calls?.[0];
    const args = toolCall?.function?.arguments;
    if (!args) {
      console.error('No tool call in AI response', JSON.stringify(json).slice(0, 500));
      return new Response(JSON.stringify({ error: 'no classification' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const parsed = typeof args === 'string' ? JSON.parse(args) : args;

    // Reshape events array → map by id for easy client lookup.
    const eventsMap: Record<string, unknown> = {};
    for (const e of parsed.events ?? []) {
      if (e?.id && e?.segment) eventsMap[e.id] = e.segment;
    }

    return new Response(JSON.stringify({
      intro: parsed.intro ?? null,
      events: eventsMap,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (err) {
    console.error('classify-event-emotions error', err);
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'unknown' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
