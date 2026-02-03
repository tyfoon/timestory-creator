/**
 * Measure exact audio duration using Web Audio API.
 * This decodes the audio and returns the precise duration in seconds.
 */
export async function measureAudioDuration(base64Audio: string): Promise<number> {
  try {
    // Convert base64 to ArrayBuffer
    const binaryString = atob(base64Audio);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create AudioContext and decode the audio
    const audioContext = new AudioContext();
    const audioBuffer = await audioContext.decodeAudioData(bytes.buffer);
    
    // Close context to free resources
    await audioContext.close();
    
    return audioBuffer.duration;
  } catch (error) {
    console.error('Failed to measure audio duration:', error);
    return 0;
  }
}
