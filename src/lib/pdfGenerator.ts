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

// Month names in Dutch
const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const monthNamesShort = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];

// Try to infer the month from the event title, description, or date string
const inferMonthFromEvent = (event: TimelineEvent): number | null => {
  // First, if month is already set, use it
  if (event.month) return event.month;
  
  // Try to extract from the date field (could be "15 januari 1969" format)
  const dateStr = event.date?.toLowerCase() || '';
  const titleStr = event.title?.toLowerCase() || '';
  const descStr = event.description?.toLowerCase() || '';
  const combinedText = `${dateStr} ${titleStr} ${descStr}`;
  
  // Check for Dutch month names
  for (let i = 0; i < monthNames.length; i++) {
    if (combinedText.includes(monthNames[i])) {
      return i + 1;
    }
  }
  
  // Check for common date patterns like "15-01-1969" or "1969-01-15"
  const datePatterns = [
    /(\d{1,2})-(\d{1,2})-(\d{4})/,  // dd-mm-yyyy
    /(\d{4})-(\d{1,2})-(\d{1,2})/,  // yyyy-mm-dd
  ];
  
  for (const pattern of datePatterns) {
    const match = dateStr.match(pattern);
    if (match) {
      // For dd-mm-yyyy format
      if (match[3]?.length === 4) {
        const month = parseInt(match[2], 10);
        if (month >= 1 && month <= 12) return month;
      }
      // For yyyy-mm-dd format
      if (match[1]?.length === 4) {
        const month = parseInt(match[2], 10);
        if (month >= 1 && month <= 12) return month;
      }
    }
  }
  
  return null;
};

// Collage layout configurations - creative asymmetric positions
// Each layout has a "top" and "bottom" slot for 2 items per page
type CollageSlot = {
  imgX: number;
  imgY: number;
  imgW: number;
  imgH: number;
  textX: number;
  textY: number;
  textW: number;
  textMaxH: number;
  rotation?: number; // Visual hint for slight tilt effect (we simulate with shadow offset)
};

// Generate creative collage layouts - 2 items per page, varying sizes
const getCollageLayouts = (pageWidth: number, pageHeight: number, ribbonWidth: number): CollageSlot[][] => {
  const contentStartX = ribbonWidth + 5;
  const availableWidth = pageWidth - contentStartX - 10;
  const halfPageHeight = (pageHeight - 40) / 2; // 40 for margins
  
  return [
    // Layout 1: Large top-left, small bottom-right
    [
      { imgX: contentStartX, imgY: 30, imgW: availableWidth * 0.65, imgH: halfPageHeight * 0.75, textX: contentStartX + availableWidth * 0.68, textY: 35, textW: availableWidth * 0.30, textMaxH: halfPageHeight * 0.70 },
      { imgX: contentStartX + availableWidth * 0.35, imgY: halfPageHeight + 20, imgW: availableWidth * 0.60, imgH: halfPageHeight * 0.65, textX: contentStartX, textY: halfPageHeight + 25, textW: availableWidth * 0.32, textMaxH: halfPageHeight * 0.60, rotation: 2 }
    ],
    // Layout 2: Wide top strip, tall bottom-left
    [
      { imgX: contentStartX + 20, imgY: 30, imgW: availableWidth * 0.75, imgH: halfPageHeight * 0.55, textX: contentStartX, textY: halfPageHeight * 0.55 + 35, textW: availableWidth - 10, textMaxH: 35, rotation: -1 },
      { imgX: contentStartX, imgY: halfPageHeight + 15, imgW: availableWidth * 0.45, imgH: halfPageHeight * 0.80, textX: contentStartX + availableWidth * 0.48, textY: halfPageHeight + 20, textW: availableWidth * 0.48, textMaxH: halfPageHeight * 0.75 }
    ],
    // Layout 3: Polaroid-style scattered
    [
      { imgX: contentStartX + 10, imgY: 35, imgW: availableWidth * 0.50, imgH: halfPageHeight * 0.70, textX: contentStartX + availableWidth * 0.55, textY: 40, textW: availableWidth * 0.40, textMaxH: halfPageHeight * 0.65, rotation: 3 },
      { imgX: contentStartX + availableWidth * 0.30, imgY: halfPageHeight + 25, imgW: availableWidth * 0.55, imgH: halfPageHeight * 0.70, textX: contentStartX, textY: halfPageHeight + 30, textW: availableWidth * 0.28, textMaxH: halfPageHeight * 0.65, rotation: -2 }
    ],
    // Layout 4: Diagonal balance
    [
      { imgX: contentStartX + availableWidth * 0.25, imgY: 28, imgW: availableWidth * 0.70, imgH: halfPageHeight * 0.60, textX: contentStartX, textY: 33, textW: availableWidth * 0.23, textMaxH: halfPageHeight * 0.55 },
      { imgX: contentStartX, imgY: halfPageHeight + 20, imgW: availableWidth * 0.55, imgH: halfPageHeight * 0.75, textX: contentStartX + availableWidth * 0.58, textY: halfPageHeight + 25, textW: availableWidth * 0.38, textMaxH: halfPageHeight * 0.70, rotation: 1 }
    ],
    // Layout 5: Hero top, compact bottom
    [
      { imgX: contentStartX, imgY: 30, imgW: availableWidth * 0.80, imgH: halfPageHeight * 0.80, textX: contentStartX + availableWidth * 0.82, textY: 35, textW: availableWidth * 0.16, textMaxH: halfPageHeight * 0.75, rotation: -1 },
      { imgX: contentStartX + availableWidth * 0.40, imgY: halfPageHeight + 25, imgW: availableWidth * 0.55, imgH: halfPageHeight * 0.55, textX: contentStartX, textY: halfPageHeight + 30, textW: availableWidth * 0.38, textMaxH: halfPageHeight * 0.50 }
    ],
    // Layout 6: Side by side (more equal)
    [
      { imgX: contentStartX, imgY: 30, imgW: availableWidth * 0.55, imgH: halfPageHeight * 0.65, textX: contentStartX, textY: halfPageHeight * 0.65 + 35, textW: availableWidth * 0.50, textMaxH: 40, rotation: 2 },
      { imgX: contentStartX + availableWidth * 0.35, imgY: halfPageHeight + 15, imgW: availableWidth * 0.60, imgH: halfPageHeight * 0.70, textX: contentStartX, textY: halfPageHeight + 20, textW: availableWidth * 0.33, textMaxH: halfPageHeight * 0.65, rotation: -1 }
    ]
  ];
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
  const ribbonWidth = 28;

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

  // ===== CONTENT PAGES - 2 ITEMS PER PAGE COLLAGE LAYOUT =====
  const collageLayouts = getCollageLayouts(pageWidth, pageHeight, ribbonWidth);
  
  // Process events in pairs
  for (let i = 0; i < regularEvents.length; i += 2) {
    pdf.addPage();
    currentPage++;

    // Background
    pdf.setFillColor(...lightBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Get layout for this page
    const layoutIndex = Math.floor(i / 2) % collageLayouts.length;
    const pageLayout = collageLayouts[layoutIndex];

    // Get the two events for this page
    const event1 = regularEvents[i];
    const event2 = regularEvents[i + 1]; // May be undefined if odd number

    // Load images
    const [imgData1, imgData2] = await Promise.all([
      event1.imageUrl ? imageToBase64WithDimensions(event1.imageUrl) : Promise.resolve(null),
      event2?.imageUrl ? imageToBase64WithDimensions(event2.imageUrl) : Promise.resolve(null)
    ]);

    // Draw golden timeline ribbon on left edge
    drawCollageRibbon(pdf, event1, event2, pageHeight, accentColor, primaryColor);

    // Render first event
    renderCollageItem(pdf, event1, imgData1, pageLayout[0], primaryColor, accentColor, textColor);

    // Render second event if exists
    if (event2) {
      renderCollageItem(pdf, event2, imgData2, pageLayout[1], primaryColor, accentColor, textColor);
    }

    // Page header
    pdf.setFillColor(...primaryColor);
    pdf.rect(ribbonWidth, 0, pageWidth - ribbonWidth, 22, 'F');
    pdf.setFontSize(9);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bolditalic');
    pdf.text(`TIJDREIS • ${fullName}`, ribbonWidth + 6, 14);

    // Show year range in header
    const yearRange = event2 && event2.year !== event1.year 
      ? `${event1.year} - ${event2.year}` 
      : event1.year.toString();
    pdf.setFont('times', 'bold');
    pdf.text(yearRange, pageWidth - 10, 14, { align: 'right' });

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(...textColor);
    pdf.text(`${currentPage}`, pageWidth / 2, pageHeight - 8, { align: 'center' });

    // Update progress
    const progress = 40 + Math.round((i / regularEvents.length) * 45);
    onProgress?.(Math.min(progress, 85));
  }

  // ===== SPECIAL CHAPTER: FAMOUS BIRTHDAYS WITH PHOTOS =====
  const celebrityEvents = events.filter(e => e.isCelebrityBirthday && e.imageUrl);
  const celebritiesWithoutImages = famousBirthdays.filter(fb => 
    !celebrityEvents.some(ce => ce.title.toLowerCase().includes(fb.name.toLowerCase().split(' ')[0]))
  );
  
  if (celebrityEvents.length > 0 || famousBirthdays.length > 0) {
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

    // Single column layout for celebrities - better readability
    let cardY = 70;
    const cardHeight = 55;
    const cardWidth = contentWidth;

    // First render celebrity EVENTS (which have real images)
    for (let i = 0; i < celebrityEvents.length; i++) {
      const celeb = celebrityEvents[i];
      
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

      // Card background with shadow
      pdf.setFillColor(0, 0, 0);
      pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
      pdf.roundedRect(margin + 2, cardY + 2, cardWidth, cardHeight, 4, 4, 'F');
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(margin, cardY, cardWidth, cardHeight, 4, 4, 'F');

      // Photo area (left side of card)
      const photoSize = cardHeight - 10;
      pdf.setFillColor(230, 225, 215);
      pdf.roundedRect(margin + 5, cardY + 5, photoSize, photoSize, 3, 3, 'F');

      // Load and display the actual image
      if (celeb.imageUrl) {
        try {
          const imgData = await imageToBase64WithDimensions(celeb.imageUrl);
          if (imgData) {
            const fit = fitImageInBox(imgData.width, imgData.height, photoSize, photoSize);
            pdf.addImage(
              imgData.base64, 
              'JPEG', 
              margin + 5 + fit.x, 
              cardY + 5 + fit.y, 
              fit.width, 
              fit.height
            );
          }
        } catch (e) {
          console.error('Error loading celebrity image:', e);
          // Fallback to star
          pdf.setFillColor(...accentColor);
          pdf.circle(margin + 5 + photoSize / 2, cardY + 5 + photoSize / 2, photoSize / 3, 'F');
          pdf.setFontSize(16);
          pdf.setTextColor(255, 255, 255);
          pdf.text('★', margin + 5 + photoSize / 2, cardY + 5 + photoSize / 2 + 5, { align: 'center' });
        }
      }

      // Content area (right side of card) - plenty of space now
      const textContentX = margin + photoSize + 15;
      const textContentWidth = cardWidth - photoSize - 25;

      // Extract name from title (usually "Geboorte: Name")
      let displayName = celeb.title.replace(/^Geboorte:\s*/i, '').replace(/^Geboren:\s*/i, '');
      pdf.setFontSize(14);
      pdf.setTextColor(...textColor);
      pdf.setFont('times', 'bold');
      // Truncate if too long
      while (pdf.getTextWidth(displayName) > textContentWidth - 60 && displayName.length > 10) {
        displayName = displayName.slice(0, -4) + '...';
      }
      pdf.text(displayName, textContentX, cardY + 18);

      // Description/profession
      pdf.setFontSize(10);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('times', 'italic');
      let displayDesc = celeb.description.substring(0, 80);
      if (celeb.description.length > 80) displayDesc += '...';
      const descLines = pdf.splitTextToSize(displayDesc, textContentWidth - 60);
      pdf.text(descLines.slice(0, 2), textContentX, cardY + 32);

      // Birth year badge on right side
      const badgeX = margin + cardWidth - 55;
      pdf.setFillColor(...primaryColor);
      pdf.roundedRect(badgeX, cardY + 12, 45, 20, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('times', 'bold');
      pdf.text(`★ ${celeb.year}`, badgeX + 22.5, cardY + 26, { align: 'center' });

      cardY += cardHeight + 8;
    }

    // Then render remaining famousBirthdays (without images, use star placeholder)
    for (let i = 0; i < celebritiesWithoutImages.length; i += 2) {
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

      for (let j = 0; j < 2 && i + j < celebritiesWithoutImages.length; j++) {
        const celeb = celebritiesWithoutImages[i + j];
        const x = margin + j * (cardWidth + 10);

        // Card background with shadow
        pdf.setFillColor(0, 0, 0);
        pdf.setGState(new (pdf as any).GState({ opacity: 0.1 }));
        pdf.roundedRect(x + 2, cardY + 2, cardWidth, cardHeight, 4, 4, 'F');
        pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
        
        pdf.setFillColor(255, 255, 255);
        pdf.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');

        // Photo placeholder with star
        const photoSize = cardHeight - 10;
        pdf.setFillColor(230, 225, 215);
        pdf.roundedRect(x + 5, cardY + 5, photoSize, photoSize, 3, 3, 'F');
        pdf.setFillColor(...accentColor);
        pdf.circle(x + 5 + photoSize / 2, cardY + 5 + photoSize / 2, photoSize / 3, 'F');
        pdf.setFontSize(20);
        pdf.setTextColor(255, 255, 255);
        pdf.text('★', x + 5 + photoSize / 2, cardY + 5 + photoSize / 2 + 7, { align: 'center' });

        // Content area
        const contentX = x + photoSize + 12;
        const contentMaxWidth = cardWidth - photoSize - 20;

        // Name
        pdf.setFontSize(12);
        pdf.setTextColor(...textColor);
        pdf.setFont('times', 'bold');
        let displayName = celeb.name;
        while (pdf.getTextWidth(displayName) > contentMaxWidth && displayName.length > 10) {
          displayName = displayName.slice(0, -4) + '...';
        }
        pdf.text(displayName, contentX, cardY + 22);

        // Profession
        pdf.setFontSize(9);
        pdf.setTextColor(...primaryColor);
        pdf.setFont('times', 'italic');
        let displayProf = celeb.profession;
        while (pdf.getTextWidth(displayProf) > contentMaxWidth && displayProf.length > 10) {
          displayProf = displayProf.slice(0, -4) + '...';
        }
        pdf.text(displayProf, contentX, cardY + 36);

        // Birth year
        pdf.setFillColor(...primaryColor);
        pdf.roundedRect(contentX, cardY + 52, 45, 18, 3, 3, 'F');
        pdf.setFontSize(11);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('times', 'bold');
        pdf.text(`★ ${celeb.birthYear}`, contentX + 22.5, cardY + 64, { align: 'center' });
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

// ===== COLLAGE HELPERS =====

function drawCollageRibbon(
  pdf: jsPDF,
  event1: TimelineEvent,
  event2: TimelineEvent | undefined,
  pageHeight: number,
  accentColor: [number, number, number],
  primaryColor: [number, number, number]
) {
  const ribbonWidth = 28;
  const ribbonX = 0;
  
  // Golden ribbon background
  pdf.setFillColor(...accentColor);
  pdf.rect(ribbonX, 22, ribbonWidth, pageHeight - 30, 'F');
  
  // Timeline vertical line
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(1.5);
  pdf.line(ribbonX + ribbonWidth / 2, 32, ribbonX + ribbonWidth / 2, pageHeight - 12);
  
  // First event marker (top)
  const marker1Y = 55;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(ribbonX + 3, marker1Y, ribbonWidth - 6, 50, 3, 3, 'F');
  
  // Day
  if (event1.day) {
    pdf.setFontSize(14);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bold');
    pdf.text(event1.day.toString(), ribbonX + ribbonWidth / 2, marker1Y + 14, { align: 'center' });
  }
  
  // Month
  const month1 = inferMonthFromEvent(event1);
  if (month1) {
    pdf.setFontSize(10);
    const letters = monthNamesShort[month1 - 1].split('');
    let letterY = event1.day ? marker1Y + 22 : marker1Y + 14;
    for (const letter of letters) {
      pdf.text(letter, ribbonX + ribbonWidth / 2, letterY, { align: 'center' });
      letterY += 8;
    }
  }
  
  // Year
  pdf.setFontSize(9);
  pdf.text(event1.year.toString(), ribbonX + ribbonWidth / 2, marker1Y + 46, { align: 'center' });
  
  // Connector dot
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, marker1Y + 60, 4, 'F');
  
  // Second event marker (if exists)
  if (event2) {
    const marker2Y = pageHeight / 2 + 20;
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(ribbonX + 3, marker2Y, ribbonWidth - 6, 50, 3, 3, 'F');
    
    if (event2.day) {
      pdf.setFontSize(14);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('times', 'bold');
      pdf.text(event2.day.toString(), ribbonX + ribbonWidth / 2, marker2Y + 14, { align: 'center' });
    }
    
    const month2 = inferMonthFromEvent(event2);
    if (month2) {
      pdf.setFontSize(10);
      const letters = monthNamesShort[month2 - 1].split('');
      let letterY = event2.day ? marker2Y + 22 : marker2Y + 14;
      for (const letter of letters) {
        pdf.text(letter, ribbonX + ribbonWidth / 2, letterY, { align: 'center' });
        letterY += 8;
      }
    }
    
    pdf.setFontSize(9);
    pdf.text(event2.year.toString(), ribbonX + ribbonWidth / 2, marker2Y + 46, { align: 'center' });
    
    // Bottom connector dot
    pdf.setFillColor(255, 255, 255);
    pdf.circle(ribbonX + ribbonWidth / 2, marker2Y + 60, 4, 'F');
  }
  
  // Decorative end dots
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, 32, 3, 'F');
  pdf.circle(ribbonX + ribbonWidth / 2, pageHeight - 12, 3, 'F');
}

function renderCollageItem(
  pdf: jsPDF,
  event: TimelineEvent,
  imgData: ImageData | null,
  slot: CollageSlot,
  primaryColor: [number, number, number],
  accentColor: [number, number, number],
  textColor: [number, number, number]
) {
  // Draw image with creative frame effect
  if (imgData) {
    // Shadow (offset based on rotation hint)
    const shadowOffsetX = slot.rotation ? slot.rotation * 1.5 : 3;
    const shadowOffsetY = 3;
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.12 }));
    pdf.rect(slot.imgX + shadowOffsetX, slot.imgY + shadowOffsetY, slot.imgW, slot.imgH, 'F');
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    
    // White polaroid-style frame
    pdf.setFillColor(255, 255, 255);
    pdf.rect(slot.imgX - 3, slot.imgY - 3, slot.imgW + 6, slot.imgH + 12, 'F');
    
    // Image background
    pdf.setFillColor(240, 235, 225);
    pdf.rect(slot.imgX, slot.imgY, slot.imgW, slot.imgH, 'F');
    
    // Fit and draw image
    const fit = fitImageInBox(imgData.width, imgData.height, slot.imgW, slot.imgH);
    try {
      pdf.addImage(imgData.base64, 'JPEG', slot.imgX + fit.x, slot.imgY + fit.y, fit.width, fit.height);
    } catch (e) {
      console.error('Error adding collage image:', e);
    }
    
    // Year label on image
    pdf.setFillColor(0, 0, 0);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.65 }));
    pdf.rect(slot.imgX, slot.imgY + slot.imgH - 14, 32, 14, 'F');
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('times', 'bold');
    pdf.text(event.year.toString(), slot.imgX + 5, slot.imgY + slot.imgH - 4);
  } else {
    // Placeholder
    pdf.setFillColor(230, 225, 215);
    pdf.rect(slot.imgX, slot.imgY, slot.imgW, slot.imgH, 'F');
    pdf.setFontSize(24);
    pdf.setTextColor(200, 195, 185);
    pdf.text(event.year.toString(), slot.imgX + slot.imgW / 2, slot.imgY + slot.imgH / 2, { align: 'center' });
  }
  
  // Text content
  let textY = slot.textY;
  
  // Category badge
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  const badgeWidth = Math.min(pdf.getTextWidth(categoryLabel.toUpperCase()) + 12, slot.textW);
  pdf.roundedRect(slot.textX, textY, badgeWidth, 12, 2, 2, 'F');
  pdf.setFontSize(7);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('times', 'bold');
  pdf.text(categoryLabel.toUpperCase(), slot.textX + badgeWidth / 2, textY + 8, { align: 'center' });
  
  textY += 18;
  
  // Title
  pdf.setFontSize(12);
  pdf.setTextColor(...textColor);
  pdf.setFont('times', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, slot.textW);
  const maxTitleLines = Math.min(titleLines.length, 3);
  pdf.text(titleLines.slice(0, maxTitleLines), slot.textX, textY);
  
  textY += maxTitleLines * 5.5 + 6;
  
  // Date
  const inferredMonth = inferMonthFromEvent(event);
  const dateStr = event.day && inferredMonth 
    ? `${event.day} ${monthNames[inferredMonth - 1]} ${event.year}`
    : inferredMonth 
      ? `${monthNames[inferredMonth - 1]} ${event.year}`
      : event.year.toString();
  
  pdf.setFontSize(9);
  pdf.setTextColor(...accentColor);
  pdf.setFont('times', 'italic');
  pdf.text(dateStr, slot.textX, textY);
  
  textY += 10;
  
  // Description (compact)
  if (textY < slot.textY + slot.textMaxH - 15) {
    pdf.setFontSize(9);
    pdf.setTextColor(...textColor);
    pdf.setFont('times', 'normal');
    const descLines = pdf.splitTextToSize(event.description, slot.textW);
    const availableLines = Math.floor((slot.textY + slot.textMaxH - textY) / 4.5);
    pdf.text(descLines.slice(0, Math.max(availableLines, 2)), slot.textX, textY);
  }
}
