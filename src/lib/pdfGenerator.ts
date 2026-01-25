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

// Draw the creative timeline ribbon on page edge
const drawTimelineRibbon = (
  pdf: jsPDF,
  event: TimelineEvent,
  pageHeight: number,
  accentColor: [number, number, number],
  primaryColor: [number, number, number]
) => {
  const ribbonWidth = 18;
  const ribbonX = 0;
  
  // Golden ribbon background
  pdf.setFillColor(...accentColor);
  pdf.rect(ribbonX, 25, ribbonWidth, pageHeight - 35, 'F');
  
  // Timeline dots and line
  pdf.setDrawColor(255, 255, 255);
  pdf.setLineWidth(1);
  pdf.line(ribbonX + ribbonWidth / 2, 40, ribbonX + ribbonWidth / 2, pageHeight - 20);
  
  // Top dot
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, 40, 3, 'F');
  
  // Main date marker
  const markerY = 80;
  pdf.setFillColor(...primaryColor);
  pdf.circle(ribbonX + ribbonWidth / 2, markerY, 6, 'F');
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, markerY, 3, 'F');
  
  // Month text (vertical)
  if (event.month) {
    const monthName = monthNames[event.month - 1].toUpperCase();
    pdf.setFontSize(7);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    
    // Draw each letter vertically
    const letters = monthName.split('');
    let letterY = markerY + 20;
    for (const letter of letters) {
      pdf.text(letter, ribbonX + ribbonWidth / 2, letterY, { align: 'center' });
      letterY += 8;
    }
  }
  
  // Year at bottom of ribbon
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  
  // Draw year vertically
  const yearStr = event.year.toString();
  let yearY = pageHeight - 60;
  for (const digit of yearStr) {
    pdf.text(digit, ribbonX + ribbonWidth / 2, yearY, { align: 'center' });
    yearY += 10;
  }
  
  // Bottom dot
  pdf.setFillColor(255, 255, 255);
  pdf.circle(ribbonX + ribbonWidth / 2, pageHeight - 20, 3, 'F');
  
  // Day marker if available
  if (event.day) {
    pdf.setFillColor(...primaryColor);
    pdf.roundedRect(ribbonX + 2, markerY - 25, ribbonWidth - 4, 16, 2, 2, 'F');
    pdf.setFontSize(10);
    pdf.setTextColor(255, 255, 255);
    pdf.text(event.day.toString(), ribbonX + ribbonWidth / 2, markerY - 14, { align: 'center' });
  }
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
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIJDREIS MAGAZINE', margin, titleY);

  // Decorative line
  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin, titleY + 3, pageWidth - margin, titleY + 3);

  // Main title
  pdf.setFontSize(11);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'normal');
  pdf.text('De persoonlijke reis door de tijd voor', margin, titleY + 12);

  pdf.setFontSize(28);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fullName, margin, titleY + 25);

  // Date and stats
  pdf.setFontSize(12);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(dateString, margin, titleY + 35);

  pdf.setFontSize(9);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`${events.length} gebeurtenissen • Speciale editie`, pageWidth - margin, titleY + 35, { align: 'right' });

  onProgress?.(35);

  // ===== TABLE OF CONTENTS / INTRO PAGE =====
  pdf.addPage();
  let currentPage = 2;

  pdf.setFillColor(...lightBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Decorative top stripe
  pdf.setFillColor(...accentColor);
  pdf.rect(0, 0, pageWidth, 5, 'F');

  pdf.setFontSize(24);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Jouw Verhaal', margin, 35);

  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(1);
  pdf.line(margin, 42, margin + 60, 42);

  // Summary
  if (summary) {
    pdf.setFontSize(12);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'normal');
    const summaryLines = pdf.splitTextToSize(summary, contentWidth);
    pdf.text(summaryLines, margin, 58);
  }

  // Visual index
  let tocY = 120;
  pdf.setFontSize(14);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text('In deze uitgave', margin, tocY);
  tocY += 12;

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

  // ===== SPECIAL CHAPTER: FAMOUS BIRTHDAYS (Compact) =====
  if (famousBirthdays.length > 0) {
    pdf.addPage();
    currentPage++;

    // Background
    pdf.setFillColor(...lightBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Decorative header
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    
    // Stars decoration
    pdf.setFontSize(30);
    pdf.setTextColor(255, 255, 255);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
    pdf.text('★  ★  ★  ★  ★', pageWidth / 2, 20, { align: 'center' });
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

    // Title
    pdf.setFontSize(22);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Ook Jarig op Deze Dag', pageWidth / 2, 38, { align: 'center' });

    // Compact list layout - 2 columns
    const colWidth = (contentWidth - 10) / 2;
    let leftY = 65;
    let rightY = 65;
    const rowHeight = 28;

    for (let i = 0; i < famousBirthdays.length; i++) {
      const celeb = famousBirthdays[i];
      const isLeft = i % 2 === 0;
      const x = isLeft ? margin : margin + colWidth + 10;
      const y = isLeft ? leftY : rightY;

      // Check if we need a new page
      if (y > pageHeight - 40) {
        pdf.addPage();
        currentPage++;
        pdf.setFillColor(...lightBg);
        pdf.rect(0, 0, pageWidth, pageHeight, 'F');
        
        // Mini header
        pdf.setFillColor(...accentColor);
        pdf.rect(0, 0, pageWidth, 20, 'F');
        pdf.setFontSize(10);
        pdf.setTextColor(255, 255, 255);
        pdf.setFont('helvetica', 'bold');
        pdf.text('★ OOK JARIG ★', pageWidth / 2, 13, { align: 'center' });
        
        leftY = 35;
        rightY = 35;
        continue;
      }

      // Compact card
      pdf.setFillColor(255, 255, 255);
      pdf.roundedRect(x, y, colWidth, rowHeight - 4, 3, 3, 'F');

      // Small star
      pdf.setFillColor(...accentColor);
      pdf.circle(x + 12, y + (rowHeight - 4) / 2, 8, 'F');
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.text('★', x + 12, y + (rowHeight - 4) / 2 + 3.5, { align: 'center' });

      // Name (truncated if needed)
      pdf.setFontSize(10);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      const maxNameWidth = colWidth - 55;
      let displayName = celeb.name;
      while (pdf.getTextWidth(displayName) > maxNameWidth && displayName.length > 10) {
        displayName = displayName.slice(0, -4) + '...';
      }
      pdf.text(displayName, x + 24, y + 10);

      // Profession
      pdf.setFontSize(7);
      pdf.setTextColor(...primaryColor);
      pdf.setFont('helvetica', 'normal');
      const maxProfWidth = colWidth - 55;
      let displayProf = celeb.profession;
      while (pdf.getTextWidth(displayProf) > maxProfWidth && displayProf.length > 10) {
        displayProf = displayProf.slice(0, -4) + '...';
      }
      pdf.text(displayProf, x + 24, y + 18);

      // Year badge
      pdf.setFillColor(...primaryColor);
      pdf.roundedRect(x + colWidth - 28, y + 5, 24, 14, 2, 2, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(celeb.birthYear.toString(), x + colWidth - 16, y + 14, { align: 'center' });

      if (isLeft) {
        leftY += rowHeight;
      } else {
        rightY += rowHeight;
      }
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
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIJDREIS MAGAZINE', pageWidth / 2, pageHeight / 2 - 50, { align: 'center' });

  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(pageWidth / 2 - 40, pageHeight / 2 - 43, pageWidth / 2 + 40, pageHeight / 2 - 43);

  pdf.setFontSize(28);
  pdf.setTextColor(255, 255, 255);
  pdf.text('Bedankt voor', pageWidth / 2, pageHeight / 2 - 15, { align: 'center' });
  pdf.text('het lezen!', pageWidth / 2, pageHeight / 2 + 10, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Een tijdreis speciaal voor ${fullName}`, pageWidth / 2, pageHeight / 2 + 40, { align: 'center' });

  // Stats
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.text(`${events.length} gebeurtenissen • ${years.length} jaren • ${famousBirthdays.length} beroemdheden`, pageWidth / 2, pageHeight / 2 + 60, { align: 'center' });

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
  // Full bleed image at top (55% of page), offset for ribbon
  const ribbonWidth = 18;
  const imageHeight = pageHeight * 0.55;
  const imageWidth = pageWidth - ribbonWidth;
  
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, imageWidth, imageHeight);
    
    // Image background
    pdf.setFillColor(240, 235, 225);
    pdf.rect(ribbonWidth, 0, imageWidth, imageHeight, 'F');
    
    try {
      pdf.addImage(imgData.base64, 'JPEG', ribbonWidth + fit.x, fit.y, fit.width, fit.height);
    } catch (e) {
      console.error('Error adding image:', e);
    }
  } else {
    pdf.setFillColor(...lightBg);
    pdf.rect(ribbonWidth, 0, imageWidth, imageHeight, 'F');
  }

  // Gradient overlay at bottom of image
  pdf.setFillColor(255, 255, 255);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.9 }));
  pdf.rect(0, imageHeight - 20, pageWidth, 20, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Content area
  let contentY = imageHeight + 10;

  // Year badge
  pdf.setFillColor(...accentColor);
  pdf.roundedRect(margin, contentY - 25, 50, 20, 3, 3, 'F');
  pdf.setFontSize(14);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(event.year.toString(), margin + 25, contentY - 12, { align: 'center' });

  // Category badge
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(margin + 55, contentY - 25, 45, 20, 3, 3, 'F');
  pdf.setFontSize(9);
  pdf.text(categoryLabel.toUpperCase(), margin + 77.5, contentY - 12, { align: 'center' });

  // Title
  pdf.setFontSize(22);
  pdf.setTextColor(...textColor);
  const titleLines = pdf.splitTextToSize(event.title, pageWidth - margin * 2);
  pdf.text(titleLines.slice(0, 2), margin, contentY + 10);

  contentY += titleLines.length > 1 ? 25 : 15;

  // Date
  const eventDate = formatEventDate(event);
  pdf.setFontSize(11);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(eventDate, margin, contentY + 10);

  // Scope label
  const scopeLabel = scopeLabels[event.eventScope] || '';
  pdf.text(` • ${scopeLabel}`, margin + pdf.getTextWidth(eventDate), contentY + 10);

  contentY += 20;

  // Description
  pdf.setFontSize(11);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  const descLines = pdf.splitTextToSize(event.description, pageWidth - margin * 2);
  pdf.text(descLines, margin, contentY);

  // Header bar
  renderPageHeader(pdf, fullName, event.year, pageWidth, margin, primaryColor);
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
  renderPageHeader(pdf, fullName, event.year, pageWidth, margin, primaryColor);

  const ribbonWidth = 18;
  const contentTop = 35;
  const imageWidth = (pageWidth - ribbonWidth) * 0.55;
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

  // Right side content
  const contentX = ribbonWidth + imageWidth + 10;
  const contentWidth = pageWidth - contentX - 12;
  let contentY = contentTop + 15;

  // Year
  pdf.setFontSize(48);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(event.year.toString(), contentX, contentY + 15);
  
  contentY += 35;

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  pdf.roundedRect(contentX, contentY, 55, 14, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(categoryLabel.toUpperCase(), contentX + 27.5, contentY + 9.5, { align: 'center' });

  contentY += 25;

  // Title
  pdf.setFontSize(16);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines, contentX, contentY);

  contentY += titleLines.length * 8 + 10;

  // Date
  const eventDate = formatEventDate(event);
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(eventDate, contentX, contentY);

  contentY += 15;

  // Description
  pdf.setFontSize(10);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 12), contentX, contentY);
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
  renderPageHeader(pdf, fullName, event.year, pageWidth, margin, primaryColor);

  const contentTop = 35;
  const imageWidth = pageWidth * 0.55;
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

  // Left side content
  const contentWidth = imageX - margin - 10;
  let contentY = contentTop + 15;

  // Year - vertical
  pdf.setFontSize(60);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(event.year.toString(), margin, contentY + 20);

  contentY += 45;

  // Decorative line
  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(2);
  pdf.line(margin, contentY, margin + 40, contentY);

  contentY += 15;

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFontSize(9);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(categoryLabel.toUpperCase(), margin, contentY);

  contentY += 12;

  // Title
  pdf.setFontSize(14);
  pdf.setTextColor(...textColor);
  const titleLines = pdf.splitTextToSize(event.title, contentWidth);
  pdf.text(titleLines, margin, contentY);

  contentY += titleLines.length * 7 + 10;

  // Date
  const eventDate = formatEventDate(event);
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(eventDate, margin, contentY);

  contentY += 15;

  // Description
  pdf.setFontSize(9);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  const descLines = pdf.splitTextToSize(event.description, contentWidth);
  pdf.text(descLines.slice(0, 15), margin, contentY);
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
  renderPageHeader(pdf, fullName, event.year, pageWidth, margin, primaryColor);

  // Large image area (top portion), offset for ribbon
  const ribbonWidth = 18;
  const imageAreaHeight = pageHeight * 0.48;
  const imageAreaX = ribbonWidth + 5;
  const imageAreaWidth = pageWidth - imageAreaX - 12;
  
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

  // Content below
  let contentY = imageAreaHeight + 45;

  // Year badge - large and bold
  pdf.setFillColor(...accentColor);
  pdf.circle(pageWidth - 40, contentY - 25, 25, 'F');
  pdf.setFontSize(16);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(event.year.toString(), pageWidth - 40, contentY - 20, { align: 'center' });

  // Category
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFontSize(10);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(categoryLabel.toUpperCase(), margin, contentY - 10);

  // Title
  pdf.setFontSize(20);
  pdf.setTextColor(...textColor);
  const titleLines = pdf.splitTextToSize(event.title, pageWidth - margin * 2 - 60);
  pdf.text(titleLines.slice(0, 2), margin, contentY + 10);

  contentY += titleLines.length > 1 ? 25 : 15;

  // Date
  const eventDate = formatEventDate(event);
  pdf.setFontSize(11);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(eventDate, margin, contentY + 15);

  contentY += 25;

  // Description
  pdf.setFontSize(10);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  const descLines = pdf.splitTextToSize(event.description, pageWidth - margin * 2);
  pdf.text(descLines.slice(0, 8), margin, contentY);
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
  renderPageHeader(pdf, fullName, event.year, pageWidth, margin, primaryColor);

  // Polaroid frame - offset for ribbon
  const ribbonWidth = 18;
  const polaroidWidth = 130;
  const polaroidHeight = 160;
  const polaroidX = ribbonWidth + ((pageWidth - ribbonWidth - polaroidWidth) / 2);
  const polaroidY = 50;
  const imageInset = 8;
  const bottomPadding = 30;

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

  // Year on polaroid bottom
  pdf.setFontSize(14);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(event.year.toString(), polaroidX + polaroidWidth / 2, polaroidY + polaroidHeight - 10, { align: 'center' });

  // Content below polaroid
  let contentY = polaroidY + polaroidHeight + 20;

  // Category badge
  const categoryLabel = categoryLabels[event.category] || event.category;
  pdf.setFillColor(...primaryColor);
  const badgeWidth = pdf.getTextWidth(categoryLabel.toUpperCase()) + 16;
  pdf.roundedRect((pageWidth - badgeWidth) / 2, contentY, badgeWidth, 14, 2, 2, 'F');
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(categoryLabel.toUpperCase(), pageWidth / 2, contentY + 9.5, { align: 'center' });

  contentY += 25;

  // Title - centered
  pdf.setFontSize(18);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'bold');
  const titleLines = pdf.splitTextToSize(event.title, pageWidth - margin * 3);
  for (const line of titleLines.slice(0, 2)) {
    pdf.text(line, pageWidth / 2, contentY, { align: 'center' });
    contentY += 10;
  }

  contentY += 5;

  // Date - centered
  const eventDate = formatEventDate(event);
  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(eventDate, pageWidth / 2, contentY, { align: 'center' });

  contentY += 15;

  // Description - justified
  pdf.setFontSize(10);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'normal');
  const descLines = pdf.splitTextToSize(event.description, pageWidth - margin * 3);
  pdf.text(descLines.slice(0, 6), pageWidth / 2, contentY, { align: 'center', maxWidth: pageWidth - margin * 3 });
}

function renderPageHeader(
  pdf: jsPDF,
  fullName: string,
  year: number,
  pageWidth: number,
  margin: number,
  primaryColor: [number, number, number]
) {
  const ribbonWidth = 18;
  
  pdf.setFillColor(...primaryColor);
  pdf.rect(ribbonWidth, 0, pageWidth - ribbonWidth, 25, 'F');
  
  pdf.setFontSize(9);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TIJDREIS • ${fullName}`, margin + 5, 15);
  pdf.text(year.toString(), pageWidth - 12, 15, { align: 'right' });
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
