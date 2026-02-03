/**
 * MP3 Duration Parser
 * Parses MP3 frames to calculate exact audio duration.
 * This is more reliable than byte-based estimates.
 */

// Bitrate lookup tables (kbps) for MPEG Audio Layer 3
// Index: [version][layer][bitrate_index]
const BITRATES: Record<number, Record<number, number[]>> = {
  // MPEG Version 1
  1: {
    1: [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0], // Layer 1
    2: [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0],    // Layer 2
    3: [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0],     // Layer 3
  },
  // MPEG Version 2 & 2.5
  2: {
    1: [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0],    // Layer 1
    2: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],         // Layer 2
    3: [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0],         // Layer 3
  },
};

// Sample rate lookup (Hz)
// Index: [version][sample_rate_index]
const SAMPLE_RATES: Record<number, number[]> = {
  1: [44100, 48000, 32000, 0],    // MPEG Version 1
  2: [22050, 24000, 16000, 0],    // MPEG Version 2
  3: [11025, 12000, 8000, 0],     // MPEG Version 2.5
};

// Samples per frame
// Index: [version][layer]
const SAMPLES_PER_FRAME: Record<number, Record<number, number>> = {
  1: { 1: 384, 2: 1152, 3: 1152 },  // MPEG Version 1
  2: { 1: 384, 2: 1152, 3: 576 },   // MPEG Version 2 & 2.5
};

interface FrameInfo {
  version: number;       // 1 = MPEG1, 2 = MPEG2, 3 = MPEG2.5
  layer: number;         // 1, 2, or 3
  bitrate: number;       // kbps
  sampleRate: number;    // Hz
  padding: boolean;
  frameSize: number;     // bytes
  samplesPerFrame: number;
}

/**
 * Parse a single MP3 frame header
 */
function parseFrameHeader(header: number): FrameInfo | null {
  // Check frame sync (11 bits all set)
  if ((header & 0xFFE00000) !== 0xFFE00000) {
    return null;
  }

  // Version: bits 19-20
  const versionBits = (header >> 19) & 0x03;
  let version: number;
  switch (versionBits) {
    case 0: version = 3; break;  // MPEG Version 2.5
    case 2: version = 2; break;  // MPEG Version 2
    case 3: version = 1; break;  // MPEG Version 1
    default: return null;        // Reserved
  }

  // Layer: bits 17-18
  const layerBits = (header >> 17) & 0x03;
  let layer: number;
  switch (layerBits) {
    case 1: layer = 3; break;  // Layer 3
    case 2: layer = 2; break;  // Layer 2
    case 3: layer = 1; break;  // Layer 1
    default: return null;      // Reserved
  }

  // Bitrate: bits 12-15
  const bitrateIndex = (header >> 12) & 0x0F;
  const bitrateTable = version === 1 ? BITRATES[1] : BITRATES[2];
  const bitrate = bitrateTable[layer]?.[bitrateIndex];
  if (!bitrate) return null;

  // Sample rate: bits 10-11
  const sampleRateIndex = (header >> 10) & 0x03;
  const sampleRateTable = SAMPLE_RATES[version];
  const sampleRate = sampleRateTable?.[sampleRateIndex];
  if (!sampleRate) return null;

  // Padding: bit 9
  const padding = ((header >> 9) & 0x01) === 1;

  // Samples per frame
  const versionKey = version === 1 ? 1 : 2;
  const samplesPerFrame = SAMPLES_PER_FRAME[versionKey][layer];

  // Calculate frame size
  let frameSize: number;
  if (layer === 1) {
    // Layer 1: frameSize = (12 * bitrate * 1000 / sampleRate + padding) * 4
    frameSize = Math.floor((12 * bitrate * 1000 / sampleRate + (padding ? 1 : 0)) * 4);
  } else {
    // Layer 2 & 3: frameSize = 144 * bitrate * 1000 / sampleRate + padding
    // For MPEG2/2.5 Layer 3, use 72 instead of 144
    const coefficient = (version !== 1 && layer === 3) ? 72 : 144;
    frameSize = Math.floor(coefficient * bitrate * 1000 / sampleRate + (padding ? 1 : 0));
  }

  return {
    version,
    layer,
    bitrate,
    sampleRate,
    padding,
    frameSize,
    samplesPerFrame,
  };
}

/**
 * Skip ID3v2 tag at the beginning of the file
 */
function skipId3v2(data: Uint8Array): number {
  // ID3v2 header: "ID3" + version (2 bytes) + flags (1 byte) + size (4 bytes syncsafe)
  if (data.length >= 10 &&
      data[0] === 0x49 &&  // 'I'
      data[1] === 0x44 &&  // 'D'
      data[2] === 0x33) {  // '3'
    // Size is stored as syncsafe integer (7 bits per byte)
    const size = ((data[6] & 0x7F) << 21) |
                 ((data[7] & 0x7F) << 14) |
                 ((data[8] & 0x7F) << 7) |
                 (data[9] & 0x7F);
    return 10 + size;
  }
  return 0;
}

/**
 * Parse MP3 buffer and calculate exact duration in seconds.
 * 
 * @param buffer - MP3 audio data as ArrayBuffer
 * @returns Duration in seconds
 */
export function parseMp3Duration(buffer: ArrayBuffer): number {
  const data = new Uint8Array(buffer);
  const view = new DataView(buffer);
  
  if (data.length < 10) {
    console.warn('MP3 buffer too small for parsing');
    return 0;
  }

  let offset = skipId3v2(data);
  let totalSamples = 0;
  let sampleRate = 0;
  let frameCount = 0;

  // Parse all MP3 frames
  while (offset < data.length - 4) {
    // Read potential frame header (big-endian 32-bit)
    const header = view.getUint32(offset);
    
    const frameInfo = parseFrameHeader(header);
    
    if (frameInfo) {
      // Valid frame found
      totalSamples += frameInfo.samplesPerFrame;
      sampleRate = frameInfo.sampleRate;
      frameCount++;
      offset += frameInfo.frameSize;
    } else {
      // Not a valid frame, skip one byte
      offset++;
    }

    // Safety: prevent infinite loop on corrupted files
    if (frameCount > 100000) {
      console.warn('MP3 parsing: exceeded max frame count, stopping');
      break;
    }
  }

  if (sampleRate === 0 || frameCount === 0) {
    console.warn('MP3 parsing: no valid frames found');
    return 0;
  }

  const duration = totalSamples / sampleRate;
  console.log(`MP3 parsed: ${frameCount} frames, ${sampleRate}Hz, ${duration.toFixed(3)}s`);
  
  return duration;
}
