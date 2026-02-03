
# Plan: Robuuste Audio-Video Synchronisatie

## Probleemanalyse

Je hebt twee timing-problemen die allebei dezelfde oorzaak hebben: **de audio-duur wordt geschat in plaats van gemeten**.

### Huidige situatie:
```
TTS Edge Function:
  → Krijgt MP3 bytes terug
  → Schat duur: min(bytes/5000, woorden/3.0)
  → Stuurt schatting naar frontend
  
Remotion:
  → Gebruikt geschatte duur voor visuele timing
  → Audio speelt af met WERKELIJKE duur
  → Mismatch = te lange pauzes OF afgekapte audio
```

### Oplossing: Meet de echte audio-duur

---

## Architectuur Verbeteringen

### 1. Exacte Audio Duur Meting (Server-side)

In de edge functions de échte MP3-duur berekenen door de MP3 header te parsen.

**Hoe werkt MP3 duration parsing?**
- MP3 heeft frame headers met bitrate info
- Door frames te tellen + bitrate = exacte duur
- Dit is betrouwbaar, geen schatting meer

```
[generate-speech] & [generate-speech-elevenlabs]
  → Ontvang MP3 buffer
  → Parse MP3 frames voor exacte duur
  → Return { audioContent, exactDurationSeconds }
```

### 2. Parallelle Audio Generatie (Client-side)

Momenteel worden events sequentieel verwerkt. Dit kan parallel:

```
Huidig (traag):
  Event 1 → wacht → Event 2 → wacht → Event 3...
  
Nieuw (snel):
  Event 1 ─┐
  Event 2 ─┼→ Promise.all() → klaar!
  Event 3 ─┘
```

### 3. Strakke Buffers

Met exacte duurs kunnen we minimale buffers gebruiken:
- Intro → Event 1: 3 frames (0.1s)
- Event → Event: 0 frames (naadloos)

---

## Technische Implementatie

### Stap 1: MP3 Duration Parser (Edge Functions)

Maak een gedeelde utility die MP3 frames parset:

```typescript
// supabase/functions/_shared/mp3Duration.ts

// MP3 frame header parsing voor exacte duur
function parseMp3Duration(buffer: ArrayBuffer): number {
  const view = new DataView(buffer);
  let offset = 0;
  let duration = 0;
  
  // Skip ID3 tag if present
  if (view.getUint8(0) === 0x49 && 
      view.getUint8(1) === 0x44 && 
      view.getUint8(2) === 0x33) {
    const size = (view.getUint8(6) << 21) | 
                 (view.getUint8(7) << 14) | 
                 (view.getUint8(8) << 7) | 
                 view.getUint8(9);
    offset = 10 + size;
  }
  
  // Parse MP3 frames
  while (offset < buffer.byteLength - 4) {
    const header = view.getUint32(offset);
    if ((header & 0xFFE00000) === 0xFFE00000) {
      // Valid frame sync
      const bitrate = getBitrate(header);
      const sampleRate = getSampleRate(header);
      const frameSize = calculateFrameSize(header);
      
      duration += 1152 / sampleRate; // samples per frame
      offset += frameSize;
    } else {
      offset++;
    }
  }
  
  return duration;
}
```

### Stap 2: Update Edge Functions

Beide TTS functions updaten om exacte duur te gebruiken:

```typescript
// generate-speech/index.ts

import { parseMp3Duration } from '../_shared/mp3Duration.ts';

// ... na ontvangen audioBuffer ...

const exactDurationSeconds = parseMp3Duration(audioBuffer);

return {
  audioContent: base64Encoded,
  exactDurationSeconds,  // ← Exacte waarde!
  estimatedDurationSeconds: exactDurationSeconds, // backward compat
  wordCount,
  voice: voiceName,
};
```

### Stap 3: Parallelle Audio Generatie

VideoDialog updaten voor parallel processing:

```typescript
// VideoDialog.tsx - handleGenerateAudio

// NIEUW: Parallel intro + alle events
const [introResult, ...eventResults] = await Promise.all([
  // Intro
  storyIntroduction 
    ? generateSpeech({ text: storyIntroduction, provider: voiceProvider })
    : Promise.resolve(null),
  
  // Alle events parallel
  ...events.map(async (event) => {
    const speechText = `${event.title}. ${event.description}`;
    
    const [speech, sfx] = await Promise.all([
      generateSpeech({ text: speechText, provider: voiceProvider }),
      event.soundEffectSearchQuery 
        ? fetchSoundEffect(event.soundEffectSearchQuery) 
        : null,
    ]);
    
    return { event, speech, sfx };
  }),
]);
```

### Stap 4: Strakke Timing in Remotion

Met exacte duurs kunnen we buffers minimaliseren:

```typescript
// VideoDialog.tsx

// Intro: exact duration, minimal buffer
newIntroDurationFrames = Math.round(introResult.exactDurationSeconds * FPS) + 2;

// Events: exact duration, NO buffer
audioDurationFrames = Math.round(speechResult.exactDurationSeconds * FPS);
```

---

## Samenvatting van Wijzigingen

| Bestand | Wijziging |
|---------|-----------|
| `supabase/functions/_shared/mp3Duration.ts` | Nieuw: MP3 parser utility |
| `supabase/functions/generate-speech/index.ts` | Exacte duur ipv schatting |
| `supabase/functions/generate-speech-elevenlabs/index.ts` | Exacte duur ipv schatting |
| `src/components/video/VideoDialog.tsx` | Parallelle generatie + strakke buffers |

---

## Verwachte Resultaten

- **Geen lange pauzes meer**: Exacte audio duur = visuele duur matcht perfect
- **Geen afgekapte audio**: Audio eindigt precies wanneer visual wisselt
- **Snellere generatie**: Parallel = 3-5x sneller dan sequentieel
- **Naadloze transitions**: Minimale buffers door betrouwbare timing

---

## Alternatief (Simpeler maar minder precies)

Als MP3 parsing te complex blijkt, kunnen we ook:
1. De audio client-side decoderen met Web Audio API
2. De `AudioBuffer.duration` property uitlezen
3. Dit toevoegen vóór video generatie start

Dit is minder efficiënt (audio 2x verwerken) maar werkt ook.
