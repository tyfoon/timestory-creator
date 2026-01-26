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
    finalWidth = boxWidth;
    finalHeight = boxWidth / imgRatio;
  } else {
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

const getFullName = (formData: FormData): string => {
  const { firstName, lastName } = formData.optionalData;
  if (firstName || lastName) {
    return [firstName, lastName].filter(Boolean).join(' ');
  }
  return 'Onbekend';
};

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

const monthNames = ['januari', 'februari', 'maart', 'april', 'mei', 'juni', 
                    'juli', 'augustus', 'september', 'oktober', 'november', 'december'];

const monthNamesShort = ['JAN', 'FEB', 'MRT', 'APR', 'MEI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEC'];

// 80s color palette - neon and vibrant
const eightysPalette = {
  hotPink: [255, 20, 147] as [number, number, number],
  electricBlue: [0, 255, 255] as [number, number, number],
  neonYellow: [255, 255, 0] as [number, number, number],
  purple: [148, 0, 211] as [number, number, number],
  orange: [255, 140, 0] as [number, number, number],
  black: [20, 20, 30] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  darkPurple: [40, 20, 60] as [number, number, number],
  mint: [0, 255, 180] as [number, number, number],
};

// Get a random rotation for polaroid effect (-12 to 12 degrees)
const getRandomRotation = (index: number): number => {
  const rotations = [-8, 5, -3, 7, -6, 4, -5, 8, -4, 6, -7, 3];
  return rotations[index % rotations.length];
};

// Get random 80s accent color
const getRandomAccentColor = (index: number): [number, number, number] => {
  const colors = [
    eightysPalette.hotPink,
    eightysPalette.electricBlue,
    eightysPalette.neonYellow,
    eightysPalette.purple,
    eightysPalette.orange,
    eightysPalette.mint,
  ];
  return colors[index % colors.length];
};

const inferMonthFromEvent = (event: TimelineEvent): number | null => {
  if (event.month) return event.month;
  
  const dateStr = event.date?.toLowerCase() || '';
  const titleStr = event.title?.toLowerCase() || '';
  const descStr = event.description?.toLowerCase() || '';
  const combinedText = `${dateStr} ${titleStr} ${descStr}`;
  
  for (let i = 0; i < monthNames.length; i++) {
    if (combinedText.includes(monthNames[i])) {
      return i + 1;
    }
  }
  
  return null;
};

// Draw a polaroid frame with rotation simulation
const drawPolaroidFrame = (
  pdf: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  imgData: ImageData | null,
  caption: string,
  year: number,
  accentColor: [number, number, number]
) => {
  const polaroidPadding = 6;
  const bottomPadding = 25; // Extra space for caption at bottom
  const frameWidth = width + polaroidPadding * 2;
  const frameHeight = height + polaroidPadding + bottomPadding;
  
  // Calculate offset based on rotation for visual effect
  const rotationOffset = rotation * 0.3;
  const adjustedX = x + rotationOffset;
  const adjustedY = y - Math.abs(rotation) * 0.2;
  
  // Draw shadow (offset based on rotation)
  const shadowOffset = 4 + Math.abs(rotation) * 0.3;
  pdf.setFillColor(0, 0, 0);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.2 }));
  pdf.rect(
    adjustedX - polaroidPadding + shadowOffset,
    adjustedY - polaroidPadding + shadowOffset,
    frameWidth,
    frameHeight,
    'F'
  );
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  
  // White polaroid frame
  pdf.setFillColor(...eightysPalette.white);
  pdf.rect(
    adjustedX - polaroidPadding,
    adjustedY - polaroidPadding,
    frameWidth,
    frameHeight,
    'F'
  );
  
  // Accent color strip at top of frame
  pdf.setFillColor(...accentColor);
  pdf.rect(
    adjustedX - polaroidPadding,
    adjustedY - polaroidPadding,
    frameWidth,
    3,
    'F'
  );
  
  // Image placeholder/background
  pdf.setFillColor(40, 40, 50);
  pdf.rect(adjustedX, adjustedY, width, height, 'F');
  
  // Add image if available
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, width, height);
    try {
      pdf.addImage(
        imgData.base64,
        'JPEG',
        adjustedX + fit.x,
        adjustedY + fit.y,
        fit.width,
        fit.height
      );
    } catch (e) {
      console.error('Error adding polaroid image:', e);
    }
  }
  
  // Caption area - handwritten style
  const captionY = adjustedY + height + polaroidPadding + 12;
  pdf.setFontSize(10);
  pdf.setTextColor(...eightysPalette.black);
  pdf.setFont('helvetica', 'bold');
  
  // Year in accent color
  pdf.setTextColor(...accentColor);
  pdf.text(year.toString(), adjustedX + 4, captionY);
  
  // Short caption
  pdf.setTextColor(...eightysPalette.black);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const shortCaption = caption.length > 30 ? caption.substring(0, 27) + '...' : caption;
  pdf.text(shortCaption, adjustedX + 4, captionY + 8);
};

export const generatePolaroidPdf = async (
  options: PdfGeneratorOptions,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const { events, famousBirthdays, formData, summary } = options;
  
  const regularEvents = events.filter(e => !e.isCelebrityBirthday);
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;

  const fullName = getFullName(formData);
  const dateString = formatDate(formData);

  onProgress?.(5);

  // ===== COVER PAGE - 80s style with neon =====
  // Gradient-like background with dark purple
  pdf.setFillColor(...eightysPalette.darkPurple);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Diagonal neon stripes
  pdf.setFillColor(...eightysPalette.hotPink);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
  for (let i = 0; i < 8; i++) {
    pdf.rect(0, 30 + i * 40, pageWidth, 5, 'F');
  }
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  
  // Cyan accent lines
  pdf.setFillColor(...eightysPalette.electricBlue);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.4 }));
  for (let i = 0; i < 6; i++) {
    pdf.rect(0, 50 + i * 45, pageWidth, 2, 'F');
  }
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Load cover images
  const coverEvents = regularEvents.filter(e => e.imageUrl).slice(0, 5);
  const imagePromises = coverEvents.map(e => 
    e.imageUrl ? imageToBase64WithDimensions(e.imageUrl) : Promise.resolve(null)
  );
  const coverImages = await Promise.all(imagePromises);

  onProgress?.(25);

  // Scattered polaroids on cover
  const coverPolaroidLayouts = [
    { x: 20, y: 40, w: 70, h: 55, rot: -8 },
    { x: 110, y: 30, w: 65, h: 50, rot: 6 },
    { x: 55, y: 100, w: 75, h: 60, rot: 3 },
    { x: 15, y: 165, w: 60, h: 48, rot: -5 },
    { x: 100, y: 150, w: 80, h: 65, rot: 7 },
  ];

  for (let i = 0; i < coverPolaroidLayouts.length && i < coverImages.length; i++) {
    const layout = coverPolaroidLayouts[i];
    const imgData = coverImages[i];
    const event = coverEvents[i];
    const accentColor = getRandomAccentColor(i);
    
    if (imgData && event) {
      drawPolaroidFrame(
        pdf,
        layout.x,
        layout.y,
        layout.w,
        layout.h,
        layout.rot,
        imgData,
        event.title,
        event.year,
        accentColor
      );
    }
  }

  // Title section at bottom
  pdf.setFillColor(...eightysPalette.black);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.85 }));
  pdf.rect(0, pageHeight - 55, pageWidth, 55, 'F');
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));

  // Neon border on title box
  pdf.setDrawColor(...eightysPalette.hotPink);
  pdf.setLineWidth(2);
  pdf.line(0, pageHeight - 55, pageWidth, pageHeight - 55);
  
  pdf.setDrawColor(...eightysPalette.electricBlue);
  pdf.setLineWidth(1);
  pdf.line(0, pageHeight - 52, pageWidth, pageHeight - 52);

  // Magazine title - 80s typography
  pdf.setFontSize(12);
  pdf.setTextColor(...eightysPalette.neonYellow);
  pdf.setFont('helvetica', 'bold');
  pdf.text('★ TIJDREIS POLAROID EDITIE ★', margin, pageHeight - 42);

  // Main title
  pdf.setFontSize(10);
  pdf.setTextColor(...eightysPalette.electricBlue);
  pdf.setFont('helvetica', 'normal');
  pdf.text('De persoonlijke reis door de tijd voor', margin, pageHeight - 32);

  pdf.setFontSize(28);
  pdf.setTextColor(...eightysPalette.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fullName, margin, pageHeight - 18);

  // Date
  pdf.setFontSize(12);
  pdf.setTextColor(...eightysPalette.hotPink);
  pdf.text(dateString, pageWidth - margin, pageHeight - 18, { align: 'right' });

  onProgress?.(35);

  // ===== CONTENT PAGES - 3 polaroids per page =====
  const polaroidsPerPage = 3;
  const polaroidWidth = 75;
  const polaroidHeight = 60;
  
  for (let i = 0; i < regularEvents.length; i += polaroidsPerPage) {
    pdf.addPage();
    
    // 80s background
    pdf.setFillColor(...eightysPalette.darkPurple);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Subtle grid pattern
    pdf.setDrawColor(...eightysPalette.purple);
    pdf.setLineWidth(0.2);
    pdf.setGState(new (pdf as any).GState({ opacity: 0.3 }));
    for (let g = 0; g < pageWidth; g += 20) {
      pdf.line(g, 0, g, pageHeight);
    }
    for (let g = 0; g < pageHeight; g += 20) {
      pdf.line(0, g, pageWidth, g);
    }
    pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
    
    // Header bar
    pdf.setFillColor(...eightysPalette.black);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    pdf.setDrawColor(...eightysPalette.hotPink);
    pdf.setLineWidth(1.5);
    pdf.line(0, 25, pageWidth, 25);
    
    pdf.setFontSize(10);
    pdf.setTextColor(...eightysPalette.electricBlue);
    pdf.setFont('helvetica', 'bold');
    pdf.text('TIJDREIS POLAROID', margin, 16);
    
    pdf.setTextColor(...eightysPalette.neonYellow);
    pdf.text(fullName, pageWidth - margin, 16, { align: 'right' });

    // Polaroid positions (scattered effect)
    const polaroidPositions = [
      { x: 35, y: 50, rot: getRandomRotation(i) },
      { x: 100, y: 45, rot: getRandomRotation(i + 1) },
      { x: 65, y: 140, rot: getRandomRotation(i + 2) },
    ];

    // Load images for this page
    const pageEvents = regularEvents.slice(i, i + polaroidsPerPage);
    const pageImagePromises = pageEvents.map(e => 
      e.imageUrl ? imageToBase64WithDimensions(e.imageUrl) : Promise.resolve(null)
    );
    const pageImages = await Promise.all(pageImagePromises);

    // Draw polaroids
    for (let j = 0; j < pageEvents.length && j < polaroidPositions.length; j++) {
      const event = pageEvents[j];
      const imgData = pageImages[j];
      const pos = polaroidPositions[j];
      const accentColor = getRandomAccentColor(i + j);

      drawPolaroidFrame(
        pdf,
        pos.x,
        pos.y,
        polaroidWidth,
        polaroidHeight,
        pos.rot,
        imgData,
        event.title,
        event.year,
        accentColor
      );

      // Add event details as text blocks
      const textX = j % 2 === 0 ? margin : margin + 100;
      const textY = j === 0 ? 120 : (j === 1 ? 115 : 220);
      
      // Only add text if not overlapping with polaroid
      if (j === 0 || j === 2) {
        // Category badge
        const categoryLabel = categoryLabels[event.category] || event.category;
        pdf.setFillColor(...accentColor);
        pdf.roundedRect(textX - 5, textY - 8, 50, 12, 2, 2, 'F');
        pdf.setFontSize(7);
        pdf.setTextColor(...eightysPalette.black);
        pdf.setFont('helvetica', 'bold');
        pdf.text(categoryLabel.toUpperCase(), textX - 2, textY);

        // Title
        pdf.setFontSize(11);
        pdf.setTextColor(...eightysPalette.white);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(event.title, 80);
        pdf.text(titleLines.slice(0, 2), textX - 5, textY + 15);

        // Date
        const inferredMonth = inferMonthFromEvent(event);
        const dateStr = event.day && inferredMonth 
          ? `${event.day} ${monthNames[inferredMonth - 1]} ${event.year}`
          : inferredMonth 
            ? `${monthNames[inferredMonth - 1]} ${event.year}`
            : event.year.toString();
        
        pdf.setFontSize(9);
        pdf.setTextColor(...accentColor);
        pdf.setFont('helvetica', 'italic');
        pdf.text(dateStr, textX - 5, textY + 28);
      }
    }

    // Page number
    pdf.setFontSize(10);
    pdf.setTextColor(...eightysPalette.hotPink);
    pdf.setFont('helvetica', 'bold');
    pdf.text(`${Math.floor(i / polaroidsPerPage) + 2}`, pageWidth / 2, pageHeight - 12, { align: 'center' });

    const progress = 35 + Math.round((i / regularEvents.length) * 50);
    onProgress?.(Math.min(progress, 85));
  }

  // ===== FAMOUS BIRTHDAYS PAGE =====
  if (famousBirthdays.length > 0) {
    pdf.addPage();
    
    pdf.setFillColor(...eightysPalette.darkPurple);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');
    
    // Neon header
    pdf.setFillColor(...eightysPalette.hotPink);
    pdf.rect(0, 0, pageWidth, 50, 'F');
    
    // Stars
    pdf.setFontSize(20);
    pdf.setTextColor(...eightysPalette.neonYellow);
    pdf.text('★  ★  ★  ★  ★', pageWidth / 2, 22, { align: 'center' });
    
    pdf.setFontSize(22);
    pdf.setTextColor(...eightysPalette.white);
    pdf.setFont('helvetica', 'bold');
    pdf.text('OOK JARIG!', pageWidth / 2, 40, { align: 'center' });

    let cardY = 65;
    const cardHeight = 35;

    for (let i = 0; i < famousBirthdays.length && cardY < pageHeight - 50; i++) {
      const celeb = famousBirthdays[i];
      const accentColor = getRandomAccentColor(i);
      
      // Card background
      pdf.setFillColor(...eightysPalette.black);
      pdf.setGState(new (pdf as any).GState({ opacity: 0.8 }));
      pdf.roundedRect(margin, cardY, pageWidth - margin * 2, cardHeight, 4, 4, 'F');
      pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
      
      // Accent strip
      pdf.setFillColor(...accentColor);
      pdf.roundedRect(margin, cardY, 5, cardHeight, 4, 0, 'F');
      pdf.rect(margin + 3, cardY, 2, cardHeight, 'F');
      
      // Name
      pdf.setFontSize(14);
      pdf.setTextColor(...eightysPalette.white);
      pdf.setFont('helvetica', 'bold');
      pdf.text(celeb.name, margin + 15, cardY + 15);
      
      // Profession
      pdf.setFontSize(10);
      pdf.setTextColor(...accentColor);
      pdf.setFont('helvetica', 'italic');
      pdf.text(celeb.profession, margin + 15, cardY + 26);
      
      // Birth year badge
      pdf.setFillColor(...accentColor);
      pdf.roundedRect(pageWidth - margin - 50, cardY + 8, 40, 18, 3, 3, 'F');
      pdf.setFontSize(12);
      pdf.setTextColor(...eightysPalette.black);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`★ ${celeb.birthYear}`, pageWidth - margin - 30, cardY + 20, { align: 'center' });
      
      cardY += cardHeight + 8;
    }
  }

  onProgress?.(95);

  // ===== BACK COVER =====
  pdf.addPage();
  
  pdf.setFillColor(...eightysPalette.black);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');
  
  // Neon grid effect
  pdf.setDrawColor(...eightysPalette.purple);
  pdf.setLineWidth(0.3);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.4 }));
  for (let g = 0; g < pageWidth; g += 15) {
    pdf.line(g, 0, g, pageHeight);
  }
  for (let g = 0; g < pageHeight; g += 15) {
    pdf.line(0, g, pageWidth, g);
  }
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  
  // Decorative neon circles
  pdf.setDrawColor(...eightysPalette.hotPink);
  pdf.setLineWidth(2);
  pdf.circle(40, pageHeight / 2 - 50, 30);
  pdf.setDrawColor(...eightysPalette.electricBlue);
  pdf.circle(pageWidth - 50, pageHeight / 2 + 40, 40);
  pdf.setDrawColor(...eightysPalette.neonYellow);
  pdf.circle(pageWidth / 2, pageHeight / 2, 50);

  // Center content
  pdf.setFontSize(12);
  pdf.setTextColor(...eightysPalette.hotPink);
  pdf.setFont('helvetica', 'bold');
  pdf.text('★ POLAROID EDITIE ★', pageWidth / 2, pageHeight / 2 - 40, { align: 'center' });

  pdf.setFontSize(32);
  pdf.setTextColor(...eightysPalette.white);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bedankt!', pageWidth / 2, pageHeight / 2, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setTextColor(...eightysPalette.electricBlue);
  pdf.setFont('helvetica', 'italic');
  pdf.text(`Een tijdreis speciaal voor ${fullName}`, pageWidth / 2, pageHeight / 2 + 25, { align: 'center' });

  // Stats
  pdf.setFontSize(10);
  pdf.setTextColor(...eightysPalette.neonYellow);
  pdf.text(`${events.length} gebeurtenissen • ${famousBirthdays.length} beroemdheden`, pageWidth / 2, pageHeight / 2 + 45, { align: 'center' });

  // Generated date
  pdf.setFontSize(8);
  pdf.setTextColor(100, 100, 120);
  const now = new Date();
  pdf.text(`Gegenereerd op ${now.toLocaleDateString('nl-NL')}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  onProgress?.(100);

  // Save the PDF
  const fileName = `tijdreis-polaroid-${fullName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  pdf.save(fileName);
};
