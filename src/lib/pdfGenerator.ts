import jsPDF from 'jspdf';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { FormData } from '@/types/form';

interface PdfGeneratorOptions {
  events: TimelineEvent[];
  famousBirthdays: FamousBirthday[];
  formData: FormData;
  summary: string;
}

// Convert image URL to base64 data URL
const imageToBase64 = async (url: string): Promise<string | null> => {
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Error loading image:', e);
    return null;
  }
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
    .slice(0, 4);
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

export const generateTimelinePdf = async (
  options: PdfGeneratorOptions,
  onProgress?: (progress: number) => void
): Promise<void> => {
  const { events, famousBirthdays, formData, summary } = options;
  
  // Create PDF in A4 format
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const margin = 15;
  const contentWidth = pageWidth - (margin * 2);

  // Colors (magazine style - vintage/sepia tones)
  const primaryColor: [number, number, number] = [139, 90, 43]; // Warm brown
  const accentColor: [number, number, number] = [184, 134, 11]; // Gold
  const textColor: [number, number, number] = [51, 51, 51]; // Dark gray
  const lightBg: [number, number, number] = [250, 245, 235]; // Cream

  const fullName = getFullName(formData);
  const dateString = formatDate(formData);
  const coverEvents = getCoverEvents(events);

  onProgress?.(5);

  // ===== COVER PAGE =====
  // Background
  pdf.setFillColor(...lightBg);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Top decorative border
  pdf.setFillColor(...accentColor);
  pdf.rect(0, 0, pageWidth, 8, 'F');
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 8, pageWidth, 3, 'F');

  // Magazine title at top
  pdf.setFontSize(14);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TIJDREIS', pageWidth / 2, 22, { align: 'center' });

  // Decorative line
  pdf.setDrawColor(...accentColor);
  pdf.setLineWidth(0.5);
  pdf.line(margin + 40, 27, pageWidth - margin - 40, 27);

  // Load cover images (2x2 grid)
  let yPos = 35;
  const imageSize = 80;
  const imageGap = 5;
  const gridStartX = (pageWidth - (imageSize * 2 + imageGap)) / 2;

  onProgress?.(10);

  // Load images in parallel
  const imagePromises = coverEvents.map(e => e.imageUrl ? imageToBase64(e.imageUrl) : Promise.resolve(null));
  const coverImages = await Promise.all(imagePromises);

  onProgress?.(30);

  // Draw cover images in 2x2 grid
  for (let i = 0; i < 4; i++) {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = gridStartX + col * (imageSize + imageGap);
    const y = yPos + row * (imageSize + imageGap);

    // Draw placeholder/frame
    pdf.setFillColor(230, 225, 215);
    pdf.setDrawColor(...primaryColor);
    pdf.setLineWidth(1);
    pdf.rect(x, y, imageSize, imageSize, 'FD');

    if (coverImages[i]) {
      try {
        pdf.addImage(coverImages[i]!, 'JPEG', x + 2, y + 2, imageSize - 4, imageSize - 4);
      } catch (e) {
        console.error('Error adding cover image:', e);
      }
    }

    // Add small caption if event exists
    if (coverEvents[i]) {
      pdf.setFontSize(6);
      pdf.setTextColor(255, 255, 255);
      pdf.setFillColor(0, 0, 0, 0.6);
      pdf.rect(x, y + imageSize - 10, imageSize, 10, 'F');
      pdf.text(coverEvents[i].year.toString(), x + 4, y + imageSize - 3);
    }
  }

  yPos += imageSize * 2 + imageGap + 15;

  // Main title
  pdf.setFontSize(12);
  pdf.setTextColor(...primaryColor);
  pdf.setFont('helvetica', 'normal');
  pdf.text('De persoonlijke reis door de tijd voor', pageWidth / 2, yPos, { align: 'center' });

  yPos += 12;

  // Person's name - large and bold
  pdf.setFontSize(32);
  pdf.setTextColor(...textColor);
  pdf.setFont('helvetica', 'bold');
  pdf.text(fullName, pageWidth / 2, yPos, { align: 'center' });

  yPos += 15;

  // Date
  pdf.setFontSize(16);
  pdf.setTextColor(...accentColor);
  pdf.setFont('helvetica', 'italic');
  pdf.text(dateString, pageWidth / 2, yPos, { align: 'center' });

  yPos += 20;

  // Summary preview
  if (summary) {
    pdf.setFontSize(10);
    pdf.setTextColor(...textColor);
    pdf.setFont('helvetica', 'italic');
    const summaryLines = pdf.splitTextToSize(summary, contentWidth - 20);
    pdf.text(summaryLines.slice(0, 3), pageWidth / 2, yPos, { align: 'center', maxWidth: contentWidth - 20 });
  }

  // Bottom decorative border
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, pageHeight - 11, pageWidth, 3, 'F');
  pdf.setFillColor(...accentColor);
  pdf.rect(0, pageHeight - 8, pageWidth, 8, 'F');

  // Edition info at bottom
  pdf.setFontSize(8);
  pdf.setTextColor(255, 255, 255);
  pdf.text(`${events.length} gebeurtenissen • Speciale editie`, pageWidth / 2, pageHeight - 3, { align: 'center' });

  onProgress?.(40);

  // ===== CONTENT PAGES =====
  // Group events by year for magazine sections
  const eventsByYear = new Map<number, TimelineEvent[]>();
  events.forEach(event => {
    const year = event.year;
    if (!eventsByYear.has(year)) {
      eventsByYear.set(year, []);
    }
    eventsByYear.get(year)!.push(event);
  });

  const years = Array.from(eventsByYear.keys()).sort((a, b) => a - b);
  let currentPage = 1;
  const totalPages = Math.ceil(events.length / 3) + 1;

  for (let yearIdx = 0; yearIdx < years.length; yearIdx++) {
    const year = years[yearIdx];
    const yearEvents = eventsByYear.get(year)!;

    for (let i = 0; i < yearEvents.length; i += 2) {
      pdf.addPage();
      currentPage++;

      // Page background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, pageWidth, pageHeight, 'F');

      // Header bar
      pdf.setFillColor(...primaryColor);
      pdf.rect(0, 0, pageWidth, 20, 'F');
      
      pdf.setFontSize(10);
      pdf.setTextColor(255, 255, 255);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`TIJDREIS • ${fullName}`, margin, 13);
      pdf.text(year.toString(), pageWidth - margin, 13, { align: 'right' });

      let contentY = 30;

      // Render up to 2 events per page
      for (let j = 0; j < 2 && i + j < yearEvents.length; j++) {
        const event = yearEvents[i + j];
        const eventHeight = 110;

        if (contentY + eventHeight > pageHeight - 25) break;

        // Event container
        pdf.setFillColor(...lightBg);
        pdf.setDrawColor(...accentColor);
        pdf.setLineWidth(0.3);
        pdf.roundedRect(margin, contentY, contentWidth, eventHeight, 3, 3, 'FD');

        // Category badge
        const categoryLabel = categoryLabels[event.category] || event.category;
        pdf.setFillColor(...accentColor);
        pdf.roundedRect(margin + 5, contentY + 5, 30, 8, 2, 2, 'F');
        pdf.setFontSize(6);
        pdf.setTextColor(255, 255, 255);
        pdf.text(categoryLabel.toUpperCase(), margin + 20, contentY + 10, { align: 'center' });

        // Scope badge
        const scopeLabel = scopeLabels[event.eventScope] || event.eventScope;
        pdf.setFillColor(...primaryColor);
        pdf.roundedRect(margin + 38, contentY + 5, 25, 8, 2, 2, 'F');
        pdf.text(scopeLabel, margin + 50.5, contentY + 10, { align: 'center' });

        // Event title
        pdf.setFontSize(14);
        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'bold');
        const titleLines = pdf.splitTextToSize(event.title, contentWidth - 75);
        pdf.text(titleLines[0], margin + 5, contentY + 22);

        // Date
        pdf.setFontSize(9);
        pdf.setTextColor(...accentColor);
        pdf.setFont('helvetica', 'italic');
        const eventDate = event.day && event.month 
          ? `${event.day}-${event.month}-${event.year}`
          : event.month 
            ? `${event.month}/${event.year}`
            : `${event.year}`;
        pdf.text(eventDate, margin + 5, contentY + 30);

        // Image area (right side)
        const imageAreaX = margin + contentWidth - 55;
        const imageAreaY = contentY + 5;
        const imageAreaSize = 50;

        pdf.setFillColor(230, 225, 215);
        pdf.setDrawColor(...primaryColor);
        pdf.setLineWidth(0.5);
        pdf.rect(imageAreaX, imageAreaY, imageAreaSize, imageAreaSize, 'FD');

        if (event.imageUrl) {
          try {
            const imgData = await imageToBase64(event.imageUrl);
            if (imgData) {
              pdf.addImage(imgData, 'JPEG', imageAreaX + 2, imageAreaY + 2, imageAreaSize - 4, imageAreaSize - 4);
            }
          } catch (e) {
            console.error('Error adding event image:', e);
          }
        }

        // Description
        pdf.setFontSize(9);
        pdf.setTextColor(...textColor);
        pdf.setFont('helvetica', 'normal');
        const descLines = pdf.splitTextToSize(event.description, contentWidth - 70);
        pdf.text(descLines.slice(0, 5), margin + 5, contentY + 40, { maxWidth: contentWidth - 70 });

        // Celebrity badge if applicable
        if (event.isCelebrityBirthday) {
          pdf.setFillColor(255, 215, 0);
          pdf.roundedRect(imageAreaX, imageAreaY + imageAreaSize + 3, imageAreaSize, 6, 1, 1, 'F');
          pdf.setFontSize(5);
          pdf.setTextColor(0, 0, 0);
          pdf.text('★ OOK JARIG', imageAreaX + imageAreaSize / 2, imageAreaY + imageAreaSize + 7, { align: 'center' });
        }

        contentY += eventHeight + 8;
      }

      // Page number footer
      pdf.setFontSize(8);
      pdf.setTextColor(...textColor);
      pdf.text(`Pagina ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

      // Update progress
      const progress = 40 + Math.round((yearIdx / years.length) * 50);
      onProgress?.(progress);
    }
  }

  // ===== FAMOUS BIRTHDAYS PAGE (if any) =====
  if (famousBirthdays.length > 0) {
    pdf.addPage();
    currentPage++;

    // Background
    pdf.setFillColor(...lightBg);
    pdf.rect(0, 0, pageWidth, pageHeight, 'F');

    // Header
    pdf.setFillColor(...accentColor);
    pdf.rect(0, 0, pageWidth, 25, 'F');
    
    pdf.setFontSize(16);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.text('★ OOK JARIG OP DEZE DAG ★', pageWidth / 2, 16, { align: 'center' });

    let celebY = 35;

    for (const celeb of famousBirthdays) {
      if (celebY > pageHeight - 30) break;

      pdf.setFillColor(255, 255, 255);
      pdf.setDrawColor(...primaryColor);
      pdf.roundedRect(margin, celebY, contentWidth, 20, 2, 2, 'FD');

      pdf.setFontSize(12);
      pdf.setTextColor(...textColor);
      pdf.setFont('helvetica', 'bold');
      pdf.text(celeb.name, margin + 5, celebY + 10);

      pdf.setFontSize(10);
      pdf.setTextColor(...accentColor);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`${celeb.profession} • Geboren in ${celeb.birthYear}`, margin + 5, celebY + 17);

      celebY += 25;
    }

    // Page number
    pdf.setFontSize(8);
    pdf.setTextColor(...textColor);
    pdf.text(`Pagina ${currentPage}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
  }

  onProgress?.(95);

  // ===== BACK COVER =====
  pdf.addPage();
  
  pdf.setFillColor(...primaryColor);
  pdf.rect(0, 0, pageWidth, pageHeight, 'F');

  // Centered thank you message
  pdf.setFontSize(24);
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Bedankt voor het lezen!', pageWidth / 2, pageHeight / 2 - 20, { align: 'center' });

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Een tijdreis speciaal gemaakt voor ${fullName}`, pageWidth / 2, pageHeight / 2, { align: 'center' });

  pdf.setFontSize(10);
  pdf.setTextColor(...accentColor);
  pdf.text('TIJDREIS • Jouw verhaal in de tijd', pageWidth / 2, pageHeight / 2 + 30, { align: 'center' });

  // Generated date
  pdf.setFontSize(8);
  pdf.setTextColor(200, 200, 200);
  const now = new Date();
  pdf.text(`Gegenereerd op ${now.toLocaleDateString('nl-NL')}`, pageWidth / 2, pageHeight - 20, { align: 'center' });

  onProgress?.(100);

  // Save the PDF
  const fileName = `tijdreis-${fullName.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`;
  pdf.save(fileName);
};
