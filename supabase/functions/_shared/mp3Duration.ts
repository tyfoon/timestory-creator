/**
 * MP3 Duration Parser
 * Parses MP3 frames to calculate exact audio duration.
 * This is more reliable than byte-based estimates.
 */

// Bitrate lookup tables (kbps) for MPEG Audio Layer 3
// Index: [version][layer][bitrate_index]
const BITRATES_V1_L1 = [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448, 0];
const BITRATES_V1_L2 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384, 0];
const BITRATES_V1_L3 = [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 0];
const BITRATES_V2_L1 = [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256, 0];
const BITRATES_V2_L23 = [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, 0];

// Sample rate lookup (Hz)
const SAMPLE_RATES_V1 = [44100, 48000, 32000, 0];
const SAMPLE_RATES_V2 = [22050, 24000, 16000, 0];
const SAMPLE_RATES_V25 = [11025, 12000, 8000, 0];

interface FrameInfo {
  frameSize: number;
  samplesPerFrame: number;
  sampleRate: number;
}

/**
 * Read a 32-bit big-endian integer from a Uint8Array
 */
function readUint32BE(data: Uint8Array, offset: number): number {
  return (data[offset] << 24) | (data[offset + 1] << 16) | (data[offset + 2] << 8) | data[offset + 3];
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
  let sampleRates: number[];
  switch (versionBits) {
    case 0: version = 25; sampleRates = SAMPLE_RATES_V25; break;  // MPEG Version 2.5
    case 2: version = 2; sampleRates = SAMPLE_RATES_V2; break;     // MPEG Version 2
    case 3: version = 1; sampleRates = SAMPLE_RATES_V1; break;     // MPEG Version 1
    default: return null;  // Reserved
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
  if (bitrateIndex === 0 || bitrateIndex === 15) return null; // Free or bad
  
  let bitrate: number;
  if (version === 1) {
    // MPEG Version 1
    if (layer === 1) bitrate = BITRATES_V1_L1[bitrateIndex];
    else if (layer === 2) bitrate = BITRATES_V1_L2[bitrateIndex];
    else bitrate = BITRATES_V1_L3[bitrateIndex];
  } else {
    // MPEG Version 2 & 2.5
    if (layer === 1) bitrate = BITRATES_V2_L1[bitrateIndex];
    else bitrate = BITRATES_V2_L23[bitrateIndex];
  }
  if (!bitrate) return null;

  // Sample rate: bits 10-11
  const sampleRateIndex = (header >> 10) & 0x03;
  const sampleRate = sampleRates[sampleRateIndex];
  if (!sampleRate) return null;

  // Padding: bit 9
  const padding = ((header >> 9) & 0x01) === 1;

  // Samples per frame
  let samplesPerFrame: number;
  if (layer === 1) {
    samplesPerFrame = 384;
  } else if (layer === 2) {
    samplesPerFrame = 1152;
  } else {
    // Layer 3
    samplesPerFrame = version === 1 ? 1152 : 576;
  }

  // Calculate frame size
  let frameSize: number;
  if (layer === 1) {
    frameSize = Math.floor((12 * bitrate * 1000 / sampleRate + (padding ? 1 : 0)) * 4);
  } else {
    const coefficient = (version !== 1 && layer === 3) ? 72 : 144;
    frameSize = Math.floor(coefficient * bitrate * 1000 / sampleRate + (padding ? 1 : 0));
  }

  // Sanity check: frame size should be reasonable
  if (frameSize < 21 || frameSize > 4609) return null;

  return { frameSize, samplesPerFrame, sampleRate };
}

/**
 * Skip ID3v2 tag at the beginning of the file
 */
function skipId3v2(data: Uint8Array): number {
  if (data.length < 10) return 0;
  
  // ID3v2 header: "ID3" + version (2 bytes) + flags (1 byte) + size (4 bytes syncsafe)
  if (data[0] === 0x49 && data[1] === 0x44 && data[2] === 0x33) {
    // Size is stored as syncsafe integer (7 bits per byte)
    const size = ((data[6] & 0x7F) << 21) |
                 ((data[7] & 0x7F) << 14) |
                 ((data[8] & 0x7F) << 7) |
                 (data[9] & 0x7F);
    const offset = 10 + size;
    console.log(`MP3 parser: skipped ID3v2 tag of ${size} bytes`);
    return offset;
  }
  return 0;
}

/**
 * Parse MP3 buffer and calculate exact duration in seconds.
 * 
 * @param buffer - MP3 audio data as ArrayBuffer or Uint8Array
 * @returns Duration in seconds
 */
export function parseMp3Duration(buffer: ArrayBuffer | Uint8Array): number {
  // Handle both ArrayBuffer and Uint8Array inputs
  const data = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  
  if (data.length < 10) {
    console.warn('MP3 buffer too small for parsing');
    return 0;
  }

  // Log first few bytes for debugging
  const firstBytes = Array.from(data.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
  console.log(`MP3 parser: buffer size ${data.length}, first bytes: ${firstBytes}`);

  let offset = skipId3v2(data);
  let totalSamples = 0;
  let sampleRate = 0;
  let frameCount = 0;
  let searchCount = 0;
  const maxSearch = Math.min(data.length - 4, 50000); // Search up to 50KB for first frame

  // Find and parse all MP3 frames
  while (offset < data.length - 4) {
    // Read potential frame header using manual byte reading
    const header = readUint32BE(data, offset);
    
    const frameInfo = parseFrameHeader(header);
    
    if (frameInfo) {
      // Valid frame found
      totalSamples += frameInfo.samplesPerFrame;
      sampleRate = frameInfo.sampleRate;
      frameCount++;
      
      // Log first frame details
      if (frameCount === 1) {
        console.log(`MP3 parser: first frame at offset ${offset}, sampleRate=${frameInfo.sampleRate}, frameSize=${frameInfo.frameSize}`);
      }
      
      offset += frameInfo.frameSize;
      searchCount = 0; // Reset search counter after finding a frame
    } else {
      // Not a valid frame, skip one byte
      offset++;
      searchCount++;
      
      // If we've searched too far without finding any frames, give up
      if (frameCount === 0 && searchCount > maxSearch) {
        console.warn(`MP3 parser: no frames found in first ${maxSearch} bytes, giving up`);
        break;
      }
    }

    // Safety: prevent infinite loop
    if (frameCount > 100000) {
      console.warn('MP3 parsing: exceeded max frame count, stopping');
      break;
    }
  }

  if (sampleRate === 0 || frameCount === 0) {
    console.warn(`MP3 parsing: no valid frames found (searched ${offset} bytes)`);
    return 0;
  }

  const duration = totalSamples / sampleRate;
  console.log(`MP3 parsed: ${frameCount} frames, ${sampleRate}Hz, ${duration.toFixed(3)}s`);
  
  return duration;
}
