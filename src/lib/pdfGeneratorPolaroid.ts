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

// Get a random rotation for polaroid effect (5 to 25 degrees, randomly positive or negative)
const getRandomRotation = (index: number): number => {
  const rotations = [12, -18, 8, -15, 22, -10, 16, -25, 7, -20, 14, -9, 19, -13, 24, -6];
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

// Draw a polaroid frame with actual rotation using canvas transform
const drawPolaroidFrame = (
  pdf: jsPDF,
  centerX: number,
  centerY: number,
  width: number,
  height: number,
  rotationDeg: number,
  imgData: ImageData | null,
  caption: string,
  year: number,
  accentColor: [number, number, number]
) => {
  const polaroidPadding = 8;
  const bottomPadding = 28; // Extra space for caption at bottom
  const frameWidth = width + polaroidPadding * 2;
  const frameHeight = height + polaroidPadding + bottomPadding;
  
  // Convert rotation to radians
  const rotationRad = (rotationDeg * Math.PI) / 180;
  
  // Save the current state
  const context = (pdf as any).context2d;
  
  // Use jsPDF internal transform for rotation
  // We'll simulate rotation by drawing at slightly offset positions based on rotation
  const rotationOffsetX = Math.sin(rotationRad) * frameHeight * 0.15;
  const rotationOffsetY = -Math.cos(rotationRad) * frameWidth * 0.05 + Math.abs(rotationDeg) * 0.8;
  
  const adjustedX = centerX - frameWidth / 2 + rotationOffsetX;
  const adjustedY = centerY - frameHeight / 2 + rotationOffsetY;
  
  // Draw shadow (offset based on rotation direction)
  const shadowOffsetX = rotationDeg > 0 ? 5 : -5;
  const shadowOffsetY = 6;
  pdf.setFillColor(0, 0, 0);
  pdf.setGState(new (pdf as any).GState({ opacity: 0.25 }));
  
  // Draw shadow as a skewed rectangle to simulate rotation
  const skewFactor = rotationDeg * 0.08;
  pdf.triangle(
    adjustedX + shadowOffsetX, adjustedY + shadowOffsetY,
    adjustedX + frameWidth + shadowOffsetX + skewFactor, adjustedY + shadowOffsetY - skewFactor,
    adjustedX + frameWidth + shadowOffsetX + skewFactor * 2, adjustedY + frameHeight + shadowOffsetY,
    'F'
  );
  pdf.triangle(
    adjustedX + shadowOffsetX, adjustedY + shadowOffsetY,
    adjustedX + frameWidth + shadowOffsetX + skewFactor * 2, adjustedY + frameHeight + shadowOffsetY,
    adjustedX + shadowOffsetX + skewFactor, adjustedY + frameHeight + shadowOffsetY + skewFactor,
    'F'
  );
  pdf.setGState(new (pdf as any).GState({ opacity: 1 }));
  
  // Draw white polaroid frame as a skewed quadrilateral
  pdf.setFillColor(...eightysPalette.white);
  
  // Top-left, Top-right, Bottom-right, Bottom-left
  const skew = rotationDeg * 0.12;
  const corners = [
    { x: adjustedX - skew, y: adjustedY },
    { x: adjustedX + frameWidth + skew, y: adjustedY - skew * 0.5 },
    { x: adjustedX + frameWidth + skew * 2, y: adjustedY + frameHeight },
    { x: adjustedX + skew, y: adjustedY + frameHeight + skew * 0.5 }
  ];
  
  // Draw as two triangles
  pdf.triangle(corners[0].x, corners[0].y, corners[1].x, corners[1].y, corners[2].x, corners[2].y, 'F');
  pdf.triangle(corners[0].x, corners[0].y, corners[2].x, corners[2].y, corners[3].x, corners[3].y, 'F');
  
  // Accent color strip at top of frame
  pdf.setFillColor(...accentColor);
  pdf.triangle(
    corners[0].x, corners[0].y,
    corners[1].x, corners[1].y,
    corners[1].x - skew * 0.3, corners[1].y + 4,
    'F'
  );
  pdf.triangle(
    corners[0].x, corners[0].y,
    corners[1].x - skew * 0.3, corners[1].y + 4,
    corners[0].x + skew * 0.3, corners[0].y + 4,
    'F'
  );
  
  // Image area (inside the frame)
  const imgX = adjustedX + polaroidPadding;
  const imgY = adjustedY + polaroidPadding;
  
  pdf.setFillColor(30, 30, 40);
  pdf.rect(imgX, imgY, width, height, 'F');
  
  // Add image if available
  if (imgData) {
    const fit = fitImageInBox(imgData.width, imgData.height, width, height);
    try {
      pdf.addImage(
        imgData.base64,
        'JPEG',
        imgX + fit.x,
        imgY + fit.y,
        fit.width,
        fit.height
      );
    } catch (e) {
      console.error('Error adding polaroid image:', e);
    }
  }
  
  // Caption area at bottom of polaroid
  const captionY = adjustedY + height + polaroidPadding + 16;
  
  // Year in accent color (bold)
  pdf.setFontSize(12);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(year.toString(), imgX + 4, captionY);
  
  // Short caption below year
  pdf.setTextColor(...eightysPalette.black);
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  const maxCaptionWidth = width - 8;
  const shortCaption = caption.length > 35 ? caption.substring(0, 32) + '...' : caption;
  pdf.text(shortCaption, imgX + 4, captionY + 10, { maxWidth: maxCaptionWidth });
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

  // Scattered polaroids on cover with 5-25 degree rotations
  const coverPolaroidLayouts = [
    { centerX: 55, centerY: 75, w: 70, h: 55, rot: -18 },
    { centerX: 145, centerY: 65, w: 65, h: 50, rot: 15 },
    { centerX: 90, centerY: 140, w: 75, h: 60, rot: 8 },
    { centerX: 45, centerY: 195, w: 60, h: 48, rot: -22 },
    { centerX: 140, centerY: 185, w: 70, h: 55, rot: 12 },
  ];

  for (let i = 0; i < coverPolaroidLayouts.length && i < coverImages.length; i++) {
    const layout = coverPolaroidLayouts[i];
    const imgData = coverImages[i];
    const event = coverEvents[i];
    const accentColor = getRandomAccentColor(i);
    
    if (imgData && event) {
      drawPolaroidFrame(
        pdf,
        layout.centerX,
        layout.centerY,
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

  // ===== CONTENT PAGES - 2 polaroids per page (no overlapping text) =====
  const polaroidsPerPage = 2;
  const polaroidWidth = 85;
  const polaroidHeight = 70;
  
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

    // Layout: 2 polaroids with dedicated text areas (no overlap)
    // Top polaroid: left side, text on right
    // Bottom polaroid: right side, text on left
    const layouts = [
      { 
        polaroidCenterX: 70,  // Center X of polaroid
        polaroidCenterY: 95,  // Center Y of polaroid  
        textX: 130,           // Text block X
        textY: 50,            // Text block Y
        textWidth: 65,        // Text block width
        rot: getRandomRotation(i)
      },
      { 
        polaroidCenterX: 140, 
        polaroidCenterY: 210,
        textX: margin,
        textY: 170,
        textWidth: 70,
        rot: getRandomRotation(i + 1)
      }
    ];

    // Load images for this page
    const pageEvents = regularEvents.slice(i, i + polaroidsPerPage);
    const pageImagePromises = pageEvents.map(e => 
      e.imageUrl ? imageToBase64WithDimensions(e.imageUrl) : Promise.resolve(null)
    );
    const pageImages = await Promise.all(pageImagePromises);

    // Draw polaroids and their text blocks
    for (let j = 0; j < pageEvents.length && j < layouts.length; j++) {
      const event = pageEvents[j];
      const imgData = pageImages[j];
      const layout = layouts[j];
      const accentColor = getRandomAccentColor(i + j);

      // Draw polaroid with rotation
      drawPolaroidFrame(
        pdf,
        layout.polaroidCenterX,
        layout.polaroidCenterY,
        polaroidWidth,
        polaroidHeight,
        layout.rot,
        imgData,
        event.title,
        event.year,
        accentColor
      );

      // Draw text block in separate area (no overlap with polaroid)
      const textX = layout.textX;
      let textY = layout.textY;
      
      // Category badge
      const categoryLabel = categoryLabels[event.category] || event.category;
      pdf.setFillColor(...accentColor);
      pdf.roundedRect(textX, textY, 55, 14, 3, 3, 'F');
      pdf.setFontSize(8);
      pdf.setTextColor(...eightysPalette.black);
      pdf.setFont('helvetica', 'bold');
      pdf.text(categoryLabel.toUpperCase(), textX + 5, textY + 10);
      
      textY += 22;

      // Title
      pdf.setFontSize(13);
      pdf.setTextColor(...eightysPalette.white);
      pdf.setFont('helvetica', 'bold');
      const titleLines = pdf.splitTextToSize(event.title, layout.textWidth);
      pdf.text(titleLines.slice(0, 3), textX, textY);
      
      textY += titleLines.slice(0, 3).length * 6 + 8;

      // Date
      const inferredMonth = inferMonthFromEvent(event);
      const dateStr = event.day && inferredMonth 
        ? `${event.day} ${monthNames[inferredMonth - 1]} ${event.year}`
        : inferredMonth 
          ? `${monthNames[inferredMonth - 1]} ${event.year}`
          : event.year.toString();
      
      pdf.setFontSize(10);
      pdf.setTextColor(...accentColor);
      pdf.setFont('helvetica', 'italic');
      pdf.text(dateStr, textX, textY);
      
      textY += 12;
      
      // Description (if space allows)
      if (event.description && textY < layout.textY + 80) {
        pdf.setFontSize(9);
        pdf.setTextColor(200, 200, 220);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(event.description, layout.textWidth);
        pdf.text(descLines.slice(0, 4), textX, textY);
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
