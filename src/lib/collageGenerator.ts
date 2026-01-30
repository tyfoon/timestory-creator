/**
 * Polaroid Collage Generator
 * Generates a portrait-oriented collage image from selected timeline events
 */
import html2canvas from 'html2canvas';
import { TimelineEvent } from '@/types/timeline';

// Import the cork/paper background
import woodTableBg from '@/assets/wood-table-bg.jpg';

interface CollageConfig {
  width: number;
  height: number;
  padding: number;
  polaroidWidth: number;
  polaroidHeight: number;
  imageHeight: number;
}

const COLLAGE_CONFIG: CollageConfig = {
  width: 1080,
  height: 1920,
  padding: 40,
  polaroidWidth: 450,
  polaroidHeight: 520,
  imageHeight: 380,
};

// Random rotation for playful effect (-8 to 8 degrees)
const getRandomRotation = (index: number): number => {
  const rotations = [-7, 4, -3, 6, -5, 2];
  return rotations[index % rotations.length];
};

// Create individual polaroid HTML
const createPolaroidHtml = (event: TimelineEvent, index: number): string => {
  const rotation = getRandomRotation(index);
  const imageUrl = event.imageUrl || '/placeholder.svg';
  
  return `
    <div style="
      width: ${COLLAGE_CONFIG.polaroidWidth}px;
      height: ${COLLAGE_CONFIG.polaroidHeight}px;
      background: linear-gradient(180deg, #ffffff 0%, #f8f8f8 100%);
      border-radius: 4px;
      padding: 16px 16px 40px 16px;
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3), 0 4px 10px rgba(0, 0, 0, 0.2);
      transform: rotate(${rotation}deg);
      display: flex;
      flex-direction: column;
    ">
      <div style="
        width: 100%;
        height: ${COLLAGE_CONFIG.imageHeight}px;
        background-image: url('${imageUrl}');
        background-size: cover;
        background-position: center top;
        border: 1px solid #e0e0e0;
      "></div>
      <p style="
        font-family: 'Caveat', cursive, sans-serif;
        font-size: 24px;
        color: #333;
        text-align: center;
        margin-top: 12px;
        line-height: 1.2;
        overflow: hidden;
        text-overflow: ellipsis;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
      ">${event.title}</p>
    </div>
  `;
};

// Create the full collage container HTML
const createCollageHtml = (
  selectedEvents: TimelineEvent[],
  contextText: string
): string => {
  const polaroidsHtml = selectedEvents.map((event, index) => createPolaroidHtml(event, index)).join('');
  
  return `
    <div id="collage-container" style="
      width: ${COLLAGE_CONFIG.width}px;
      height: ${COLLAGE_CONFIG.height}px;
      background-image: url('${woodTableBg}');
      background-size: cover;
      background-position: center;
      position: relative;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    ">
      <!-- Dark overlay for better contrast -->
      <div style="
        position: absolute;
        inset: 0;
        background: rgba(0, 0, 0, 0.15);
      "></div>
      
      <!-- Header with context text -->
      <div style="
        position: absolute;
        top: ${COLLAGE_CONFIG.padding}px;
        right: ${COLLAGE_CONFIG.padding}px;
        font-family: 'Caveat', cursive, sans-serif;
        font-size: 42px;
        color: #fff;
        text-shadow: 2px 2px 8px rgba(0, 0, 0, 0.6);
        text-align: right;
        z-index: 10;
      ">${contextText}</div>
      
      <!-- Grid of polaroids: 2 columns x 3 rows -->
      <div style="
        position: absolute;
        top: 120px;
        left: 50%;
        transform: translateX(-50%);
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        grid-template-rows: repeat(3, 1fr);
        gap: 30px 20px;
        padding: ${COLLAGE_CONFIG.padding}px;
        z-index: 5;
      ">
        ${polaroidsHtml}
      </div>
      
      <!-- Footer -->
      <div style="
        position: absolute;
        bottom: ${COLLAGE_CONFIG.padding}px;
        left: 0;
        right: 0;
        text-align: center;
        font-family: 'Georgia', serif;
        font-size: 24px;
        color: rgba(255, 255, 255, 0.9);
        text-shadow: 1px 1px 4px rgba(0, 0, 0, 0.5);
        z-index: 10;
      ">Gemaakt met hetjaarvan.nl</div>
    </div>
  `;
};

/**
 * Download a polaroid collage from selected events
 */
export async function downloadPolaroidCollage(
  selectedEvents: TimelineEvent[],
  contextText: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (selectedEvents.length !== 6) {
    throw new Error('Exactly 6 events are required for the collage');
  }
  
  onProgress?.(10);
  
  // Create hidden container
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-9999px';
  container.style.top = '0';
  container.style.zIndex = '-1';
  container.innerHTML = createCollageHtml(selectedEvents, contextText);
  document.body.appendChild(container);
  
  onProgress?.(20);
  
  // Wait for images to load
  const images = container.querySelectorAll('div[style*="background-image"]');
  const imagePromises = Array.from(images).map((img) => {
    const style = (img as HTMLElement).style.backgroundImage;
    const urlMatch = style.match(/url\(['"]?([^'"]+)['"]?\)/);
    if (urlMatch && urlMatch[1] && !urlMatch[1].includes('placeholder')) {
      return new Promise<void>((resolve) => {
        const testImg = new Image();
        testImg.crossOrigin = 'anonymous';
        testImg.onload = () => resolve();
        testImg.onerror = () => resolve(); // Continue even if image fails
        testImg.src = urlMatch[1];
      });
    }
    return Promise.resolve();
  });
  
  await Promise.all(imagePromises);
  onProgress?.(40);
  
  // Find the collage element
  const collageElement = container.querySelector('#collage-container') as HTMLElement;
  if (!collageElement) {
    document.body.removeChild(container);
    throw new Error('Could not find collage container');
  }
  
  onProgress?.(50);
  
  try {
    // Generate canvas with html2canvas
    const canvas = await html2canvas(collageElement, {
      width: COLLAGE_CONFIG.width,
      height: COLLAGE_CONFIG.height,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#2a2015',
      logging: false,
    });
    
    onProgress?.(80);
    
    // Convert to blob and download
    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create blob'));
      }, 'image/png', 1.0);
    });
    
    onProgress?.(90);
    
    // Trigger download
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `polaroid-collage-${Date.now()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    onProgress?.(100);
  } finally {
    // Cleanup
    document.body.removeChild(container);
  }
}
