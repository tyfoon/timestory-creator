import jsPDF from 'jspdf';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { FormData } from '@/types/form';

interface PdfGeneratorOptions {
  events: TimelineEvent[];
  famousBirthdays: FamousBirthday[];
  formData: FormData;
  summary: string;
}

interface ImageData {
  base64: string;
  width: number;
  height: number;
  aspectRatio: number;
}

// Convert image URL to base64 data URL with dimensions
const imageToBase64WithDimensions = async (url: string): Promise<ImageData | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        // Create an image to get dimensions
        const img = new Image();
        img.onload = () => {
          resolve({
            base64,
            width: img.width,
            height: img.height,
            aspectRatio: img.width / img.height
          });
        };
        img.onerror = () => resolve(null);
        img.src = base64;
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error loading image:', e);
    return null;
  }
};

// Calculate dimensions preserving aspect ratio
const fitImageInBox = (
  imgWidth: number, 
  imgHeight: number, 
  boxWidth: number, 
  boxHeight: number
): { width: number; height: number; x: number; y: number } => {
  const imgRatio = imgWidth / imgHeight;
  const boxRatio = boxWidth / boxHeight;
  
  let finalWidth: number;
  let finalHeight: number;
  
  if (imgRatio > boxRatio) {
    // Image is wider - fit to width
    finalWidth = boxWidth;
    finalHeight = boxWidth / imgRatio;
  } else {
    // Image is taller - fit to height
    finalHeight = boxHeight;
    finalWidth = boxHeight * imgRatio;
  }
  
  return {
    width: finalWidth,
    height: finalHeight,
    x: (boxWidth - finalWidth) / 2,
    y: (boxHeight - finalHeight) / 2
  };
};

// Get the full name from form data
const getFullName = (formData: FormData): string => {
  const { firstName, lastName } = formData.optionalData;
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return 'Onbekend';
};

// Get important events for cover (high importance + birthdate scope)
const getCoverEvents = (events: TimelineEvent[]): TimelineEvent[] => {
  return events
    .filter(e => e.imageUrl && (e.importance === 'high' || e.eventScope === 'birthdate'))
    .slice(0, 5);
};

// Format date for display
const formatDate = (formData: FormData): string => {
  if (formData.type === 'birthdate' && formData.birthDate) {
    const { day, month, year } = formData.birthDate;
    const months = ['januari', 'februari', 'maart', 'april', 'mei', 'juni',
      'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `${day} ${months[month - 1]} ${year}`;
  }
  if (formData.yearRange) {
    return `${formData.yearRange.startYear} - ${formData.yearRange.endYear}`;
  }
  return '';
};

// Category translations
const categoryLabels: Record<string, string> = {
  politics: 'Politiek',
  sports: 'Sport',
  entertainment: 'Entertainment',
  science: 'Wetenschap',
  culture: 'Cultuur',
  world: 'Wereld',
  local: 'Lokaal',
  personal: 'Persoonlijk',
  music: 'Muziek',
  technology: 'Technologie',
  celebrity: 'Beroemd'
};

// Event scope labels
const scopeLabels: Record<string, string> = {
  birthdate: 'Op deze dag',
  birthmonth: 'Deze maand',
  birthyear: 'Dit jaar',
  period: 'Periode'
};

// Layout types for variety
type LayoutType = 'fullBleed' | 'leftHero' | 'rightHero' | 'splitDiagonal' | 'polaroid';

const getLayoutForIndex = (index: number): LayoutType => {
  const layouts: LayoutType[] = ['fullBleed', 'leftHero', 'rightHero', 'splitDiagonal', 'polaroid'];
  return layouts[index % layouts.length];
};

// Month names in Dutch
const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

// Draw the creative timeline ribbon on page edge - shows MONTH prominently
const drawTimelineRibbon = (
  pdf: jsPDF,
  event: TimelineEvent,
  pageHeight: number,
  accentColor: [number, number, number],
  primaryColor: [number, number, number]
) => {
  const ribbonWidth = 30;
  const ribbonX = 0;
  
  // Golden ribbon background
  pdf.setFillColor(...accentColor);
  pdf.rect(ribbonX, 25, ribbonWidth, pageHeight - 35, 'F');
  
  // Timeline vertical line
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(2);
  pdf.line(ribbonX + ribbonWidth / 2, 35, ribbonX + ribbonWidth / 2, pageHeight - 15);
  
  // Top connection dot
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, 35, 5, 'F');
  
  // === PROMINENT MONTH DISPLAY ===
  const monthBoxY = 45;
  
  // Month background box - taller for vertical text
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(ribbonX + 3, monthBoxY, ribbonWidth - 6, 80, 4, 4, 'F');
  
  // Day number at top (large)
  if (event.day) {
    pdf.setFontSize(18);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bold');
    pdf.text(event.day.toString(), ribbonX + ribbonWidth / 2, monthBoxY + 16, { align: 'center' });
  }
  
  // Month name - VERTICAL letters for visibility
  if (event.month) {
    const monthName = monthNames[event.month - 1].substring(0, 3).toUpperCase();
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bold');
    const startY = event.day ? monthBoxY + 28 : monthBoxY + 16;
    // Draw letters vertically
    const letters = monthName.split('');
    let letterY = startY;
    for (const letter of letters) {
      pdf.text(letter, ribbonX + ribbonWidth / 2, letterY, { align: 'center' });
      letterY += 11;
    }
  }
  
  // Year at bottom of box
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(event.year.toString(), ribbonX + ribbonWidth / 2, monthBoxY + 73, { align: 'center' });
  
  // Timeline marker dot
  const markerY = monthBoxY + 95;
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, markerY, 6, 'F');
  pdf.setFillColor(...primaryColor);
  pdf.circle(ribbonX + ribbonWidth / 2, markerY, 4, 'F');
  
  // Decorative dots along the timeline
  for (let dotY = markerY + 35; dotY < pageHeight - 30; dotY += 30) {
    pdf.setFillColor(255, 255, 255);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.4 }));
    pdf.circle(ribbonX + ribbonWidth / 2, dotY, 2, 'F');
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  }
  
  // Bottom connection dot
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, pageHeight - 15, 5, 'F');
};

export const generateTimelinePdf = async (
  options: PdfGeneratorOptions,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const { events, famousBirthdays, formData, summary } = options;
  
  // Filter out celebrity birthday events - they go in a special chapter
  const regularEvents = events.filter(e => !e.isCelebrityBirthday);
  
  // Create PDF in A4 format
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 12;
  const contentWidth = pageWidth - (margin * 2);

  // Colors (magazine style - vintage/sepia tones)
  const primaryColor: [number, number, number] = [139, 90, 43]; // Warm brown
  const accentColor: [number, number, number] = [184, 134, 11]; // Gold
  const textColor: [number, number, number] = [51, 51, 51]; // Dark gray
  const lightBg: [number, number, number] = [250, 245, 235]; // Cream
  const darkBg: [number, number, number] = [45, 35, 25]; // Dark brown

  const fullName = getFullName(formData);
  const dateString = formatDate(formData);
  const coverEvents = getCoverEvents(events);

  onProgress?.(5);

  // ===== COVER PAGE - Creative collage layout =====
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Load cover images in parallel
  const imagePromises = coverEvents.map(e => 
    e.imageUrl ? imageToBase64WithDimensions(e.imageUrl) : Promise.resolve(null)
  );
  const coverImages = await Promise.all(imagePromises);

  onProgress?.(25);

  // Creative asymmetric collage layout
  const coverLayouts = [
    { x: 0, y: 0, w: 130, h: 160 },      // Large left image
    { x: 135, y: 10, w: 70, h: 90 },     // Top right
    { x: 140, y: 105, w: 65, h: 85 },    // Mid right
    { x: 10, y: 165, w: 85, h: 70 },     // Bottom left
    { x: 100, y: 195, w: 100, h: 60 },   // Bottom right
  ];

  for (let i = 0; i < coverLayouts.length && i < coverImages.length; i++) {
    const layout = coverLayouts[i];
    const imgData = coverImages[i];
    
    if (imgData) {
      const fit = fitImageInBox(imgData.width, imgData.height, layout.w, layout.h);
      
      // White border effect
      pdf.setFillColor(255, 255, 255);
      pdf.rect(layout.x - 2, layout.y - 2, layout.w + 4, layout.h + 4, 'F');
      
      // Slight shadow
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
      pdf.rect(layout.x + 3, layout.y + 3, layout.w, layout.h, 'F');
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      
      try {
        pdf.addImage(
          imgData.base64, 
          'JPEG', 
          layout.x + fit.x, 
          layout.y + fit.y, 
          fit.width, 
          fit.height
        );
      } catch (e) {
        console.error('Error adding cover image:', e);
      }

      // Year label on image
      if (coverEvents[i]) {
        pdf.setFillColor(0, 0, 0);
        pdf.setGState(new (pdf as any).GState({ opacity: 0.7 }));
        pdf.rect(layout.x, layout.y + layout.h - 12, 35, 12, 'F');
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text(coverEvents[i].year.toString(), layout.x + 5, layout.y + layout.h - 4);
      }
    }
  }

  // Title overlay at bottom
  const titleY = pageHeight - 45;
  pdf.setFillColor(...darkBg);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.85 }));
  pdf.rect(0, titleY - 10, pageWidth, 55, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Magazine branding
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'bold');
  pdf.text('TIJDREIS MAGAZINE', margin, titleY);

  // Decorative line
  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, titleY + 3, pageWidth - margin, titleY + 3);

  // Main title
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'italic');
  pdf.text('De persoonlijke reis door de tijd voor', margin, titleY + 12);

  pdf.setFontSize(32);
  pdf.setFont('times', 'bold');
  pdf.text(fullName, margin, titleY + 26);

  // Date and stats
  pdf.setFontSize(13);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(dateString, margin, titleY + 38);

  pdf.setFontSize(9);
  pdf.setTextColor(180, 180, 180);
  pdf.setFont('times', 'normal');
  pdf.text(`${events.length} gebeurtenissen • Speciale editie`, pageWidth - margin, titleY + 38, { align: 'right' });

  onProgress?.(35);

  // ===== TABLE OF CONTENTS / INTRO PAGE =====
  pdf.addPage();
  let currentPage = 2;

  pdf.setFillColor(...lightBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative top stripe
  pdf.setFillColor(...accentColor);
  pdf.rect(0, 0, pageWidth, 5, 'F');

  pdf.setFontSize(28);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('times', 'bold');
  pdf.text('Jouw Verhaal', margin, 35);

  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(1);
  pdf.line(margin, 42, margin + 60, 42);

  // Summary
  if (summary) {
    pdf.setFontSize(12);
    pdf.setTextColor(...textColor);
    pdf.setFont('times', 'normal');
    const summaryLines = pdf.splitTextToSize(summary, contentWidth);
    pdf.text(summaryLines, margin, 58);
  }

  // Visual index
  let tocY = 120;
  pdf.setFontSize(16);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('times', 'bold');
  pdf.text('In deze uitgave', margin, tocY);
  tocY += 14;

  // Group events by year for TOC
  const eventsByYear = new Map<number, TimelineEvent[]>();
  regularEvents.forEach(event => {
    if (!eventsByYear.has(event.year)) {
      eventsByYear.set(event.year, []);
    }
    eventsByYear.get(event.year)!.push(event);
  });

  const years = Array.from(eventsByYear.keys()).sort((a, b) => a - b);

  for (const year of years.slice(0, 8)) {
    const count = eventsByYear.get(year)!.length;
    
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(margin, tocY, 50, 15, 2, 2, 'F');
    
    pdf.setFontSize(12);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text(year.toString(), margin + 25, tocY + 10, { align: 'center' });
    
    pdf.setFontSize(10);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`${count} ${count === 1 ? 'gebeurtenis' : 'gebeurtenissen'}`, margin + 58, tocY + 10);
    
    tocY += 20;
  }

  if (years.length > 8) {
    pdf.setFontSize(10);
    pdf.setTextColor(...accentColor);
    pdf.text(`+ ${years.length - 8} meer jaren...`, margin, tocY + 5);
  }

  // Page number
  pdf.setFontSize(8);
  pdf.setTextColor(...textColor);
  pdf.text(`${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  onProgress?.(40);

  // ===== CONTENT PAGES - Creative layouts =====
  let eventIndex = 0;

  for (const year of years) {
    const yearEvents = eventsByYear.get(year)!;

    for (const event of yearEvents) {
      pdf.addPage();
      currentPage++;

      const layout = getLayoutForIndex(eventIndex);
      
      // Background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Load event image
      let imgData: ImageData | null = null;
      if (event.imageUrl) {
        imgData = await imageToBase64WithDimensions(event.imageUrl);
      }

      // Draw the timeline ribbon on left edge
      drawTimelineRibbon(pdf, event, pageHeight, accentColor, primaryColor);

      // Adjusted margin for ribbon
      const ribbonMargin = 22;

      switch (layout) {
        case 'fullBleed':
          await renderFullBleedLayout(pdf, event, imgData, pageWidth, pageHeight, ribbonMargin, primaryColor, accentColor, textColor, lightBg, fullName);
          break;
        case 'leftHero':
          await renderLeftHeroLayout(pdf, event, imgData, pageWidth, pageHeight, ribbonMargin, primaryColor, accentColor, textColor, lightBg, fullName);
          break;
        case 'rightHero':
          await renderRightHeroLayout(pdf, event, imgData, pageWidth, pageHeight, ribbonMargin, primaryColor, accentColor, textColor, lightBg, fullName);
          break;
        case 'splitDiagonal':
          await renderDiagonalLayout(pdf, event, imgData, pageWidth, pageHeight, ribbonMargin, primaryColor, accentColor, textColor, lightBg, fullName);
          break;
        case 'polaroid':
          await renderPolaroidLayout(pdf, event, imgData, pageWidth, pageHeight, ribbonMargin, primaryColor, accentColor, textColor, lightBg, fullName);
          break;
      }

      // Page number
      pdf.setFontSize(8);
      pdf.setTextColor(...textColor);
      pdf.text(`${currentPage}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

      eventIndex++;
      
      // Update progress
      const progress = 40 + Math.round((eventIndex / regularEvents.length) * 45);
      onProgress?.(Math.min(progress, 85));
    }
  }

  // ===== SPECIAL CHAPTER: FAMOUS BIRTHDAYS WITH PHOTOS =====
  if (famousBirthdays.length > 0) {
    pdf.addPage();
    currentPage++;

    // Background
    pdf.setFillColor(...lightBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative header
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 0, pageWidth, 55, 'F');
    
    // Stars decoration
    pdf.setFontSize(24);
    pdf.setTextColor(255, 255, 255);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
    pdf.text('★  ★  ★  ★  ★  ★  ★', pageWidth / 2, 18, { align: 'center' });
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

    // Title with nostalgic font
    pdf.setFontSize(26);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bolditalic');
    pdf.text('Ook Jarig op Deze Dag', pageWidth / 2, 42, { align: 'center' });

    // Grid layout for celebrities with photos - 2 per row
    let cardY = 70;
    const cardHeight = 70;
    const cardWidth = (contentWidth - 10) / 2;

    for (let i = 0; i < famousBirthdays.length; i += 2) {
      // Check if we need a new page
      if (cardY + cardHeight > pageHeight - 30) {
        pdf.addPage();
        currentPage++;
        pdf.setFillColor(...lightBg);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Mini header
        pdf.setFillColor(...accentColor);
        pdf.rect(0, 0, pageWidth, 25, 'F');
        pdf.setFontSize(12);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('times', 'bold');
        pdf.text('★ Ook Jarig ★', pageWidth / 2, 16, { align: 'center' });
        
        cardY = 40;
      }

      // Render up to 2 celebrities per row
      for (let j = 0; j < 2 && i + j < famousBirthdays.length; j++) {
        const celeb = famousBirthdays[i + j];
        const x = margin + j * (cardWidth + 10);

        // Card background with shadow
        pdf.setFillColor(0, 0, 0);
        pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
        pdf.roundedRect(x + 2, cardY + 2, cardWidth, cardHeight, 4, 4, 'F');
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');

        // Photo placeholder area (left side of card)
        const photoSize = cardHeight - 10;
        pdf.setFillColor(230, 225, 215);
        pdf.roundedRect(x + 5, cardY + 5, photoSize, photoSize, 3, 3, 'F');

        // Try to load celebrity image if imageSearchQuery exists
        if (celeb.imageSearchQuery) {
          // We'll use a placeholder star for now since we don't have actual celebrity images
          pdf.setFillColor(...accentColor);
          pdf.circle(x + 5 + photoSize / 2, cardY + 5 + photoSize / 2, photoSize / 3, 'F');
          pdf.setFontSize(20);
          pdf.setTextColor(255, 255, 255);
          pdf.text('★', x + 5 + photoSize / 2, cardY + 5 + photoSize / 2 + 7, { align: 'center' });
        }

        // Content area (right side of card)
        const contentX = x + photoSize + 12;
        const contentMaxWidth = cardWidth - photoSize - 20;

        // Name with nostalgic font
        pdf.setFontSize(13);
        pdf.setTextColor(...textColor);
        pdf.setFont('times', 'bold');
        let displayName = celeb.name;
        while (pdf.getTextWidth(displayName) > contentMaxWidth && displayName.length > 10) {
          displayName = displayName.slice(0, -4) + '...';
        }
        pdf.text(displayName, contentX, cardY + 20);

        // Profession
        pdf.setFontSize(9);
        pdf.setTextColor(...primaryColor);
        pdf.setFont('times', 'italic');
        let displayProf = celeb.profession;
        while (pdf.getTextWidth(displayProf) > contentMaxWidth && displayProf.length > 10) {
          displayProf = displayProf.slice(0, -4) + '...';
        }
        pdf.text(displayProf, contentX, cardY + 32);

        // Birth year with decorative element
        pdf.setFillColor(...primaryColor);
        pdf.roundedRect(contentX, cardY + 40, 45, 18, 3, 3, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('times', 'bold');
        pdf.text(`★ ${celeb.birthYear}`, contentX + 22.5, cardY + 52, { align: 'center' });
      }

      cardY += cardHeight + 10;
    }

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(...textColor);
    pdf.text(`${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  onProgress?.(95);

  // ===== BACK COVER =====
  pdf.addPage();
  
  pdf.setFillColor(...darkBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative elements
  pdf.setFillColor(...accentColor);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.2 }));
  pdf.circle(30, 50, 40, 'F');
  pdf.circle(pageWidth - 40, pageHeight - 80, 60, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Center content
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'bold');
  pdf.text('TIJDREIS MAGAZINE', pageWidth / 2, pageHeight / 2 - 50, { align: 'center' });

  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth / 2 - 40, pageHeight / 2 - 43, pageWidth / 2 + 40, pageHeight / 2 - 43);

  pdf.setFontSize(32);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bolditalic');
  pdf.text('Bedankt voor', pageWidth / 2, pageHeight / 2 - 15, { align: 'center' });
  pdf.text('het lezen!', pageWidth / 2, pageHeight / 2 + 15, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('times', 'italic');
  pdf.text(`Een tijdreis speciaal voor ${fullName}`, pageWidth / 2, pageHeight / 2 + 45, { align: 'center' });

  // Stats
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'normal');
  pdf.text(`${events.length} gebeurtenissen • ${years.length} jaren • ${famousBirthdays.length} beroemdheden`, pageWidth / 2, pageHeight / 2 + 65, { align: 'center' });

  // Generated date
  pdf.setFontSize(8);
  pdf.setTextColor(150, 150, 150);
  const now = new Date();
  pdf.text(`Gegenereerd op ${now.toLocaleDateString('nl-NL')}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  onProgress?.(100);

  // Save the PDF
  const fileName = `tijdreis-${fullName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  pdf.save(fileName);
};

// ===== LAYOUT RENDERERS =====

async function renderFullBleedLayout(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number],
  lightBg: [number, number, number],
  fullName: string
) {
  // Header bar first
  renderPageHeader(pdf, fullName, event, pageWidth, margin, primaryColor);
  
  const ribbonWidth = 30;
  const contentStartX = ribbonWidth + 8;
  const contentWidth = pageWidth - contentStartX - 15;
  
  // Image takes right side of page (50% width)
  const imageWidth = pageWidth * 0.48;
  const imageHeight = pageHeight * 0.55;
  const imageX = pageWidth - imageWidth - 10;
  const imageY = 30;
  
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageWidth, imageHeight);
    
    // Image background
    pdf.setFillColor(240, 235, 225);
    pdf.rect(imageX, imageY, imageWidth, imageHeight, 'F');
    
    try {
      pdf.addImage(imgData.base64, 'JPEG', imageX + fit.x, imageY + fit.y, fit.width, fit.height);
    } catch (e) {
      console.error('Error adding image:', e);
    }
  } else {
    pdf.setFillColor(...lightBg);
    pdf.rect(imageX, imageY, imageWidth, imageHeight, 'F');
  }

  // Content area - LEFT side, clear of ribbon and image
  const textMaxWidth = imageX - contentStartX - 10;
  let contentY = 45;

  // Category badge
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(contentStartX, contentY, 60, 16, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(categoryLabel.toUpperCase(), contentStartX + 30, contentY + 11, { align: 'center' });

  contentY += 28;

  // Title - LARGER font
  pdf.setFontSize(22);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, textMaxWidth);
  pdf.text(titleLines.slice(0, 3), contentStartX, contentY);

  contentY += titleLines.length * 10 + 12;

  // Date with month name
  const eventDate = formatEventDate(event);
  pdf.setFontSize(12);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(eventDate, contentStartX, contentY);

  // Scope label
  const scopeLabel = scopeLabels[event.eventScope] || '';
  if (scopeLabel) {
    pdf.text(` • ${scopeLabel}`, contentStartX + pdf.getTextWidth(eventDate), contentY);
  }

  contentY += 18;

  // Description - LARGER font, starts clearly below all above content
  pdf.setFontSize(13);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'normal');
  const descLines = pdf.splitTextToSize(event.description, textMaxWidth);
  
  // Draw description, but stop before hitting the bottom of the image
  const maxDescY = imageY + imageHeight - 10;
  let descY = contentY;
  for (const line of descLines) {
    if (descY > maxDescY) break;
    pdf.text(line, contentStartX, descY);
    descY += 7;
  }
}

async function renderLeftHeroLayout(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number],
  lightBg: [number, number, number],
  fullName: string
) {
  // Header
  renderPageHeader(pdf, fullName, event, pageWidth, margin, primaryColor);

  const ribbonWidth = 30;
  const contentTop = 35;
  const imageWidth = (pageWidth - ribbonWidth) * 0.50;
  const imageHeight = pageHeight - contentTop - 50;

  // Left side image (after ribbon)
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageWidth - 5, imageHeight);
    
    pdf.setFillColor(240, 235, 225);
    pdf.rect(ribbonWidth, contentTop, imageWidth, imageHeight, 'F');
    
    try {
      pdf.addImage(imgData.base64, 'JPEG', ribbonWidth + fit.x, contentTop + fit.y, fit.width, fit.height);
    } catch (e) {
      console.error('Error adding image:', e);
    }
  } else {
    pdf.setFillColor(...lightBg);
    pdf.rect(ribbonWidth, contentTop, imageWidth, imageHeight, 'F');
  }

  // Right side content - clear of image
  const contentX = ribbonWidth + imageWidth + 12;
  const contentWidth = pageWidth - contentX - 15;
  let contentY = contentTop + 20;

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(contentX, contentY, 60, 16, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(categoryLabel.toUpperCase(), contentX + 30, contentY + 11, { align: 'center' });

  contentY += 28;

  // Title - LARGER
  pdf.setFontSize(18);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines.slice(0, 3), contentX, contentY);

  contentY += titleLines.length * 8 + 12;

  // Date with month
  const eventDate = formatEventDate(event);
  pdf.setFontSize(11);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(eventDate, contentX, contentY);

  contentY += 18;

  // Description - LARGER font
  pdf.setFontSize(12);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 10), contentX, contentY);
}

async function renderRightHeroLayout(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number],
  lightBg: [number, number, number],
  fullName: string
) {
  // Header
  renderPageHeader(pdf, fullName, event, pageWidth, margin, primaryColor);

  const ribbonWidth = 30;
  const contentTop = 35;
  const imageWidth = pageWidth * 0.50;
  const imageHeight = pageHeight - contentTop - 50;
  const imageX = pageWidth - imageWidth;

  // Right side image
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageWidth - 5, imageHeight);
    
    pdf.setFillColor(240, 235, 225);
    pdf.rect(imageX, contentTop, imageWidth, imageHeight, 'F');
    
    try {
      pdf.addImage(imgData.base64, 'JPEG', imageX + fit.x, contentTop + fit.y, fit.width, fit.height);
    } catch (e) {
      console.error('Error adding image:', e);
    }
  } else {
    pdf.setFillColor(...lightBg);
    pdf.rect(imageX, contentTop, imageWidth, imageHeight, 'F');
  }

  // Left side content - starts after ribbon
  const contentX = ribbonWidth + 8;
  const contentWidth = imageX - contentX - 12;
  let contentY = contentTop + 20;

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(contentX, contentY, 60, 16, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(categoryLabel.toUpperCase(), contentX + 30, contentY + 11, { align: 'center' });

  contentY += 28;

  // Title - LARGER
  pdf.setFontSize(16);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines.slice(0, 3), contentX, contentY);

  contentY += titleLines.length * 8 + 12;

  // Date with month
  const eventDate = formatEventDate(event);
  pdf.setFontSize(11);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(eventDate, contentX, contentY);

  contentY += 18;

  // Description - LARGER
  pdf.setFontSize(12);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 12), contentX, contentY);
}

async function renderDiagonalLayout(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number],
  lightBg: [number, number, number],
  fullName: string
) {
  // Background split
  pdf.setFillColor(...lightBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Header
  renderPageHeader(pdf, fullName, event, pageWidth, margin, primaryColor);

  // Image area (top portion), offset for ribbon
  const ribbonWidth = 30;
  const imageAreaHeight = pageHeight * 0.45;
  const imageAreaX = ribbonWidth + 5;
  const imageAreaWidth = pageWidth - imageAreaX - 15;
  
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageAreaWidth - 10, imageAreaHeight - 20);
    
    // Frame effect
    pdf.setFillColor(255, 255, 255);
    pdf.rect(imageAreaX, 35, imageAreaWidth, imageAreaHeight - 10, 'F');
    
    // Shadow
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
    pdf.rect(imageAreaX + 5, 40, imageAreaWidth, imageAreaHeight - 10, 'F');
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    
    try {
      pdf.addImage(
        imgData.base64, 
        'JPEG', 
        imageAreaX + fit.x, 
        35 + fit.y, 
        fit.width, 
        fit.height
      );
    } catch (e) {
      console.error('Error adding image:', e);
    }
  }

  // Content below image - starts after ribbon
  const contentX = ribbonWidth + 8;
  const contentWidth = pageWidth - contentX - 15;
  let contentY = imageAreaHeight + 40;

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(contentX, contentY, 60, 16, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(categoryLabel.toUpperCase(), contentX + 30, contentY + 11, { align: 'center' });

  contentY += 28;

  // Title - LARGER
  pdf.setFontSize(20);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines.slice(0, 2), contentX, contentY);

  contentY += titleLines.length * 9 + 12;

  // Date with month
  const eventDate = formatEventDate(event);
  pdf.setFontSize(12);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(eventDate, contentX, contentY);

  contentY += 18;

  // Description - LARGER
  pdf.setFontSize(13);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 7), contentX, contentY);
}

async function renderPolaroidLayout(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  pageWidth: number,
  pageHeight: number,
  margin: number,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number],
  lightBg: [number, number, number],
  fullName: string
) {
  // Cream background
  pdf.setFillColor(...lightBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Header
  renderPageHeader(pdf, fullName, event, pageWidth, margin, primaryColor);

  // Polaroid frame - offset for ribbon
  const ribbonWidth = 30;
  const polaroidWidth = 120;
  const polaroidHeight = 145;
  const polaroidX = ribbonWidth + ((pageWidth - ribbonWidth - polaroidWidth) / 2);
  const polaroidY = 45;
  const imageInset = 8;
  const bottomPadding = 25;

  // Shadow
  pdf.setFillColor(0, 0, 0);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.15 }));
  pdf.rect(polaroidX + 5, polaroidY + 5, polaroidWidth, polaroidHeight, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // White frame
  pdf.setFillColor(255, 255, 255);
  pdf.rect(polaroidX, polaroidY, polaroidWidth, polaroidHeight, 'F');

  // Image area
  const imageWidth = polaroidWidth - imageInset * 2;
  const imageHeight = polaroidHeight - bottomPadding - imageInset;

  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageWidth, imageHeight);
    
    pdf.setFillColor(240, 235, 225);
    pdf.rect(polaroidX + imageInset, polaroidY + imageInset, imageWidth, imageHeight, 'F');
    
    try {
      pdf.addImage(
        imgData.base64, 
        'JPEG', 
        polaroidX + imageInset + fit.x, 
        polaroidY + imageInset + fit.y, 
        fit.width, 
        fit.height
      );
    } catch (e) {
      console.error('Error adding image:', e);
    }
  } else {
    pdf.setFillColor(230, 225, 215);
    pdf.rect(polaroidX + imageInset, polaroidY + imageInset, imageWidth, imageHeight, 'F');
  }

  // Month on polaroid bottom (instead of year)
  pdf.setFontSize(12);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'italic');
  const polaroidLabel = event.month 
    ? `${monthNames[event.month - 1]} ${event.year}`
    : event.year.toString();
  pdf.text(polaroidLabel, polaroidX + polaroidWidth / 2, polaroidY + polaroidHeight - 8, { align: 'center' });

  // Content below polaroid - starts after ribbon
  const contentX = ribbonWidth + 8;
  const contentWidth = pageWidth - contentX - 15;
  let contentY = polaroidY + polaroidHeight + 18;

  // Category badge
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.setFont('times', 'bold');
  const badgeWidth = pdf.getTextWidth(categoryLabel.toUpperCase()) + 16;
  pdf.roundedRect(contentX, contentY, badgeWidth, 14, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(categoryLabel.toUpperCase(), contentX + badgeWidth / 2, contentY + 9.5, { align: 'center' });

  contentY += 24;

  // Title - LARGER
  pdf.setFontSize(18);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines.slice(0, 2), contentX, contentY);

  contentY += titleLines.length * 8 + 10;

  // Date with month
  const eventDate = formatEventDate(event);
  pdf.setFontSize(11);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(eventDate, contentX, contentY);

  contentY += 16;

  // Description - LARGER
  pdf.setFontSize(12);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 5), contentX, contentY);
}

function renderPageHeader(
  pdf: jsPDF,
  fullName: string,
  event: TimelineEvent,
  pageWidth: number,
  margin: number,
  primaryColor: [number, number, number]
) {
  const ribbonWidth = 30;
  
  pdf.setFillColor(...primaryColor);
  pdf.rect(ribbonWidth, 0, pageWidth - ribbonWidth, 25, 'F');
  
  pdf.setFontSize(10);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bolditalic');
  pdf.text(`TIJDREIS • ${fullName}`, ribbonWidth + 8, 16);
  
  // Show month name in header instead of year everywhere
  pdf.setFont('times', 'bold');
  const headerText = event.month 
    ? `${monthNames[event.month - 1].toUpperCase()} ${event.year}`
    : event.year.toString();
  pdf.text(headerText, pageWidth - 12, 16, { align: 'right' });
}

function formatEventDate(event: TimelineEvent): string {
  if (event.day && event.month) {
    return `${event.day}-${event.month}-${event.year}`;
  } else if (event.month) {
    const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                        'juli', 'augustus', 'september', 'oktober', 'november', 'december'];
    return `${monthNames[event.month - 1]} ${event.year}`;
  }
  return event.year.toString();
}
