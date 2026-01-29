import html2canvas from 'html2canvas';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';

interface TikTokSlide {
  type: 'event' | 'celebrity' | 'intro' | 'outro';
  title: string;
  subtitle?: string;
  year?: number;
  imageUrl?: string;
  category?: string;
}

/**
 * Select the most interesting items for TikTok slides
 */
function selectHighlights(
  events: TimelineEvent[],
  famousBirthdays: FamousBirthday[],
  summary: string
): TikTokSlide[] {
  const slides: TikTokSlide[] = [];

  // Intro slide
  slides.push({
    type: 'intro',
    title: 'Jouw Tijdreis',
    subtitle: summary.length > 100 ? summary.substring(0, 100) + '...' : summary,
  });

  // Get top events by importance (prioritize high, then medium)
  const sortedEvents = [...events]
    .filter(e => e.importance === 'high' || e.importance === 'medium')
    .sort((a, b) => {
      if (a.importance === 'high' && b.importance !== 'high') return -1;
      if (b.importance === 'high' && a.importance !== 'high') return 1;
      return a.year - b.year;
    })
    .slice(0, 6);

  // Add event slides
  sortedEvents.forEach(event => {
    slides.push({
      type: 'event',
      title: event.title,
      subtitle: event.description.length > 80 ? event.description.substring(0, 80) + '...' : event.description,
      year: event.year,
      imageUrl: event.imageUrl,
      category: event.category,
    });
  });

  // Add celebrity birthdays (max 2)
  famousBirthdays.slice(0, 2).forEach(celeb => {
    slides.push({
      type: 'celebrity',
      title: celeb.name,
      subtitle: celeb.profession,
      year: celeb.birthYear,
    });
  });

  // Outro slide
  slides.push({
    type: 'outro',
    title: 'Maak je eigen tijdreis!',
    subtitle: 'timestory-creator.lovable.app',
  });

  return slides.slice(0, 10); // Max 10 slides
}

/**
 * Create a styled HTML element for a TikTok slide (1080x1920, 9:16)
 */
function createSlideElement(slide: TikTokSlide, index: number): HTMLDivElement {
  const container = document.createElement('div');
  container.style.cssText = `
    width: 1080px;
    height: 1920px;
    position: fixed;
    left: -9999px;
    top: 0;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 80px;
    box-sizing: border-box;
    font-family: system-ui, -apple-system, sans-serif;
    overflow: hidden;
  `;

  // Background gradient based on type
  const gradients: Record<string, string> = {
    intro: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    event: 'linear-gradient(135deg, #2d1b4e 0%, #1a1a2e 50%, #16213e 100%)',
    celebrity: 'linear-gradient(135deg, #4a1942 0%, #2d1b4e 50%, #1a1a2e 100%)',
    outro: 'linear-gradient(135deg, #0f3460 0%, #16213e 50%, #1a1a2e 100%)',
  };
  container.style.background = gradients[slide.type] || gradients.event;

  // Background image if available
  if (slide.imageUrl) {
    const bgOverlay = document.createElement('div');
    bgOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      background-image: url(${slide.imageUrl});
      background-size: cover;
      background-position: center;
      opacity: 0.3;
      filter: blur(2px);
    `;
    container.appendChild(bgOverlay);

    const darkOverlay = document.createElement('div');
    darkOverlay.style.cssText = `
      position: absolute;
      inset: 0;
      background: linear-gradient(to bottom, rgba(0,0,0,0.4) 0%, rgba(0,0,0,0.7) 100%);
    `;
    container.appendChild(darkOverlay);
  }

  // Content wrapper
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    width: 100%;
  `;

  // Slide number
  if (slide.type === 'event' || slide.type === 'celebrity') {
    const number = document.createElement('div');
    number.style.cssText = `
      font-size: 120px;
      font-weight: 900;
      color: rgba(255,255,255,0.1);
      position: absolute;
      top: -200px;
      left: 50%;
      transform: translateX(-50%);
    `;
    number.textContent = String(index).padStart(2, '0');
    content.appendChild(number);
  }

  // Year badge
  if (slide.year) {
    const yearBadge = document.createElement('div');
    yearBadge.style.cssText = `
      background: linear-gradient(135deg, #f39c12 0%, #e74c3c 100%);
      color: white;
      font-size: 48px;
      font-weight: 800;
      padding: 16px 48px;
      border-radius: 60px;
      margin-bottom: 60px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    `;
    yearBadge.textContent = String(slide.year);
    content.appendChild(yearBadge);
  }

  // Category badge for events
  if (slide.category) {
    const catBadge = document.createElement('div');
    catBadge.style.cssText = `
      background: rgba(255,255,255,0.15);
      color: rgba(255,255,255,0.9);
      font-size: 28px;
      font-weight: 600;
      padding: 12px 32px;
      border-radius: 30px;
      margin-bottom: 40px;
      text-transform: uppercase;
      letter-spacing: 2px;
    `;
    catBadge.textContent = slide.category;
    content.appendChild(catBadge);
  }

  // Icon for celebrities
  if (slide.type === 'celebrity') {
    const icon = document.createElement('div');
    icon.style.cssText = `
      font-size: 80px;
      margin-bottom: 40px;
    `;
    icon.textContent = '⭐';
    content.appendChild(icon);
  }

  // Title
  const title = document.createElement('h1');
  title.style.cssText = `
    font-size: ${slide.type === 'intro' || slide.type === 'outro' ? '96px' : '72px'};
    font-weight: 900;
    color: white;
    margin: 0 0 40px 0;
    line-height: 1.2;
    text-shadow: 0 4px 24px rgba(0,0,0,0.5);
    max-width: 100%;
  `;
  title.textContent = slide.title;
  content.appendChild(title);

  // Subtitle
  if (slide.subtitle) {
    const subtitle = document.createElement('p');
    subtitle.style.cssText = `
      font-size: 42px;
      font-weight: 400;
      color: rgba(255,255,255,0.85);
      margin: 0;
      line-height: 1.5;
      max-width: 100%;
    `;
    subtitle.textContent = slide.subtitle;
    content.appendChild(subtitle);
  }

  container.appendChild(content);

  // Logo/watermark at bottom
  const watermark = document.createElement('div');
  watermark.style.cssText = `
    position: absolute;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 16px;
    color: rgba(255,255,255,0.5);
    font-size: 32px;
    font-weight: 500;
  `;
  watermark.innerHTML = `
    <span style="font-size: 40px;">⏳</span>
    <span>TimeStory</span>
  `;
  container.appendChild(watermark);

  return container;
}

/**
 * Convert HTML element to PNG File
 */
async function elementToFile(element: HTMLElement, filename: string): Promise<File> {
  document.body.appendChild(element);
  
  try {
    const canvas = await html2canvas(element, {
      width: 1080,
      height: 1920,
      scale: 1,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#1a1a2e',
    });

    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(new File([blob], filename, { type: 'image/png' }));
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png', 0.9);
    });
  } finally {
    document.body.removeChild(element);
  }
}

/**
 * Generate TikTok slides and trigger native share
 */
export async function shareTikTokHighlights(
  events: TimelineEvent[],
  famousBirthdays: FamousBirthday[],
  summary: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  // Check if Web Share API with files is supported
  if (!navigator.canShare) {
    throw new Error('Web Share API niet beschikbaar');
  }

  const slides = selectHighlights(events, famousBirthdays, summary);
  const files: File[] = [];
  
  // Generate each slide
  for (let i = 0; i < slides.length; i++) {
    onProgress?.(i + 1, slides.length);
    
    const element = createSlideElement(slides[i], i + 1);
    const file = await elementToFile(element, `timestory-${i + 1}.png`);
    files.push(file);
  }

  // Check if we can share these files
  const shareData = { files };
  
  if (!navigator.canShare(shareData)) {
    throw new Error('Kan deze bestanden niet delen');
  }

  // Trigger native share
  await navigator.share(shareData);
}

/**
 * Check if TikTok sharing is supported (mobile with Web Share API)
 */
export function canShareToTikTok(): boolean {
  if (typeof navigator === 'undefined') return false;
  if (!navigator.canShare) return false;
  
  // Test if file sharing is supported with a dummy file
  try {
    const testFile = new File(['test'], 'test.png', { type: 'image/png' });
    return navigator.canShare({ files: [testFile] });
  } catch {
    return false;
  }
}
