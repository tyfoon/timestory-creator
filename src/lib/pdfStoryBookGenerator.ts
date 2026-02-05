import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { createRoot } from 'react-dom/client';
import React from 'react';
import { TimelineEvent, FamousBirthday } from '@/types/timeline';
import { FormData } from '@/types/form';
import { EventCard } from '@/remotion/components/EventCard';
import { VideoEvent } from '@/remotion/types';
import { getEventImageUrl } from '@/remotion/utils/placeholders';

// A4 landscape dimensions in mm
const A4_WIDTH_MM = 297;
const A4_HEIGHT_MM = 210;

// Card render dimensions (16:9 aspect ratio for cinematic look)
const CARD_WIDTH = 1280;
const CARD_HEIGHT = 720;

// PDF layout: 2 cards per page (stacked vertically)
const CARD_PDF_WIDTH_MM = 270; // Leave margins
const CARD_PDF_HEIGHT_MM = (CARD_PDF_WIDTH_MM * 9) / 16; // Maintain 16:9

interface StoryBookPdfOptions {
  events: TimelineEvent[];
  famousBirthdays?: FamousBirthday[];
  formData: FormData;
  summary: string;
  storyTitle?: string;
  storyIntroduction?: string;
}

/**
 * Renders an EventCard to a canvas image
 */
async function renderEventCardToCanvas(
  event: TimelineEvent,
  eventIndex: number,
  periodLabel: string
): Promise<HTMLCanvasElement> {
  // Create container for rendering
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: ${CARD_WIDTH}px;
    height: ${CARD_HEIGHT}px;
    overflow: hidden;
    background: #f8f8f5;
  `;
  document.body.appendChild(container);

  // Convert TimelineEvent to VideoEvent format
  const videoEvent: VideoEvent = {
    ...event,
    audioDurationFrames: 150, // Dummy value, not used for rendering
  };

  // Get the image URL (uses placeholder if needed)
  const imageUrl = getEventImageUrl(videoEvent);

  // Create a wrapper that provides the Remotion-like context
  const cardWrapper = document.createElement('div');
  cardWrapper.style.cssText = `
    width: 100%;
    height: 100%;
    position: relative;
  `;
  container.appendChild(cardWrapper);

  // Render the EventCard using React
  const root = createRoot(cardWrapper);
  
  await new Promise<void>((resolve) => {
    root.render(
      React.createElement(StaticEventCard, {
        event: videoEvent,
        imageUrl,
        eventIndex,
        periodLabel,
      })
    );
    
    // Wait for render and images to load
    setTimeout(resolve, 500);
  });

  // Capture to canvas
  const canvas = await html2canvas(container, {
    width: CARD_WIDTH,
    height: CARD_HEIGHT,
    scale: 1,
    useCORS: true,
    allowTaint: true,
    backgroundColor: '#f8f8f5',
    logging: false,
  });

  // Cleanup
  root.unmount();
  document.body.removeChild(container);

  return canvas;
}

/**
 * Static version of EventCard for PDF rendering (no Remotion hooks)
 * Recreates the visual design without animations
 */
const StaticEventCard: React.FC<{
  event: VideoEvent;
  imageUrl: string;
  eventIndex: number;
  periodLabel: string;
}> = ({ event, imageUrl, eventIndex, periodLabel }) => {
  const layoutPattern = eventIndex % 3;

  const fontSerif = 'Georgia, "Times New Roman", serif';
  const fontSans = 'system-ui, -apple-system, "Segoe UI", sans-serif';
  const fontMono = 'ui-monospace, SFMono-Regular, "SF Mono", monospace';

  // Period badge
  const PeriodBadge = () =>
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: 40,
        right: 50,
        fontFamily: fontMono,
        fontSize: 13,
        textTransform: 'uppercase',
        letterSpacing: '0.2em',
        color: 'rgba(80, 80, 80, 0.7)',
        zIndex: 50,
      },
    }, periodLabel || `${event.year}`);

  // Layout 0: "THE SHOUT"
  if (layoutPattern === 0) {
    return React.createElement('div', {
      style: {
        position: 'relative',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#f8f8f5',
        overflow: 'hidden',
      },
    },
      React.createElement(PeriodBadge),
      // Giant background year
      React.createElement('div', {
        style: {
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          opacity: 0.03,
        },
      },
        React.createElement('span', {
          style: {
            fontFamily: fontSerif,
            fontSize: 450,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 0.75,
            letterSpacing: '-0.05em',
          },
        }, event.year)
      ),
      // Center content
      React.createElement('div', {
        style: {
          position: 'relative',
          zIndex: 10,
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-start',
          padding: '80px 80px 40px 80px',
          textAlign: 'center',
        },
      },
        // Date
        React.createElement('div', {
          style: {
            fontFamily: fontMono,
            fontSize: 11,
            textTransform: 'uppercase',
            letterSpacing: '0.3em',
            color: '#888',
            marginBottom: 20,
          },
        }, event.date),
        // Title
        React.createElement('h1', {
          style: {
            fontFamily: fontSerif,
            fontSize: 64,
            fontWeight: 900,
            color: '#1a1a1a',
            lineHeight: 0.95,
            marginBottom: 25,
            maxWidth: 900,
            letterSpacing: '-0.02em',
          },
        }, event.title),
        // Description
        React.createElement('p', {
          style: {
            fontFamily: fontSans,
            fontSize: 22,
            fontWeight: 300,
            color: '#444',
            lineHeight: 1.65,
            maxWidth: 700,
          },
        }, event.description)
      ),
      // Floating image
      React.createElement('div', {
        style: {
          position: 'absolute',
          bottom: 30,
          right: 40,
          width: 380,
          height: 280,
          transform: 'rotate(2deg)',
          boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.3)',
          borderRadius: 10,
          overflow: 'hidden',
        },
      },
        React.createElement('img', {
          src: imageUrl,
          crossOrigin: 'anonymous',
          referrerPolicy: 'no-referrer',
          style: {
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'top',
          },
        })
      )
    );
  }

  // Layout 1: "THE MAGAZINE"
  if (layoutPattern === 1) {
    const firstLetter = event.description.charAt(0).toUpperCase();
    const restOfDescription = event.description.slice(1);

    return React.createElement('div', {
      style: {
        position: 'relative',
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        backgroundColor: '#f8f8f5',
        overflow: 'hidden',
      },
    },
      React.createElement(PeriodBadge),
      // Two-column layout
      React.createElement('div', {
        style: {
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          padding: 40,
          gap: 40,
        },
      },
        // Left: Image
        React.createElement('div', {
          style: {
            flex: '0 0 48%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          },
        },
          React.createElement('div', {
            style: {
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.35)',
              width: '100%',
              height: 580,
            },
          },
            React.createElement('img', {
              src: imageUrl,
              crossOrigin: 'anonymous',
              referrerPolicy: 'no-referrer',
              style: {
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                objectPosition: 'top',
              },
            }),
            // Date badge on image
            React.createElement('div', {
              style: {
                position: 'absolute',
                bottom: 20,
                left: 20,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                padding: '12px 24px',
                borderRadius: 30,
                fontFamily: fontMono,
                fontSize: 12,
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
              },
            }, event.date)
          )
        ),
        // Right: Text content
        React.createElement('div', {
          style: {
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingRight: 20,
          },
        },
          // Category
          React.createElement('div', {
            style: {
              fontFamily: fontMono,
              fontSize: 10,
              textTransform: 'uppercase',
              letterSpacing: '0.25em',
              color: '#999',
              marginBottom: 20,
            },
          }, event.category),
          // Title
          React.createElement('h1', {
            style: {
              fontFamily: fontSerif,
              fontSize: 48,
              fontWeight: 700,
              color: '#1a1a1a',
              lineHeight: 1.05,
              marginBottom: 25,
              letterSpacing: '-0.01em',
            },
          }, event.title),
          // Description with drop cap
          React.createElement('div', {
            style: {
              fontFamily: fontSans,
              fontSize: 20,
              fontWeight: 300,
              color: '#444',
              lineHeight: 1.7,
            },
          },
            React.createElement('span', {
              style: {
                fontFamily: fontSerif,
                float: 'left',
                fontSize: 80,
                fontWeight: 900,
                lineHeight: 0.7,
                marginRight: 14,
                marginTop: 8,
                color: '#1a1a1a',
              },
            }, firstLetter),
            restOfDescription
          )
        )
      )
    );
  }

  // Layout 2: "THE WHISPER"
  return React.createElement('div', {
    style: {
      position: 'relative',
      width: CARD_WIDTH,
      height: CARD_HEIGHT,
      backgroundColor: '#f8f8f5',
      overflow: 'hidden',
    },
  },
    React.createElement(PeriodBadge),
    // Large background image
    React.createElement('div', {
      style: {
        position: 'absolute',
        top: 40,
        left: 40,
        right: 40,
        bottom: 40,
        borderRadius: 16,
        overflow: 'hidden',
      },
    },
      React.createElement('img', {
        src: imageUrl,
        crossOrigin: 'anonymous',
        referrerPolicy: 'no-referrer',
        style: {
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          objectPosition: 'top',
        },
      })
    ),
    // Floating text card
    React.createElement('div', {
      style: {
        position: 'absolute',
        bottom: 50,
        left: 50,
        maxWidth: 480,
        backgroundColor: 'rgba(255, 255, 255, 0.97)',
        padding: '32px 40px',
        borderRadius: 14,
        boxShadow: '0 35px 70px -15px rgba(0, 0, 0, 0.25)',
        zIndex: 20,
      },
    },
      // Date
      React.createElement('div', {
        style: {
          fontFamily: fontMono,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.25em',
          color: '#888',
          marginBottom: 14,
        },
      }, event.date),
      // Title
      React.createElement('h1', {
        style: {
          fontFamily: fontSerif,
          fontSize: 32,
          fontWeight: 700,
          color: '#1a1a1a',
          lineHeight: 1.15,
          marginBottom: 18,
        },
      }, event.title),
      // Description
      React.createElement('p', {
        style: {
          fontFamily: fontSans,
          fontSize: 18,
          fontWeight: 300,
          color: '#555',
          lineHeight: 1.7,
        },
      }, event.description)
    )
  );
};

/**
 * Creates the cover page for the StoryBook PDF
 */
async function createCoverPage(
  pdf: jsPDF,
  options: StoryBookPdfOptions
): Promise<void> {
  const { events, formData, storyTitle, storyIntroduction } = options;
  
  // Extract name and year from formData
  const firstName = formData.optionalData?.firstName || 'Jou';
  const birthYear = formData.birthDate?.year || formData.yearRange?.startYear;
  
  // Dark cinematic background
  pdf.setFillColor(26, 26, 26);
  pdf.rect(0, 0, A4_WIDTH_MM, A4_HEIGHT_MM, 'F');

  // Title
  const title = storyTitle || `Het Jaar Van ${firstName}`;
  pdf.setTextColor(255, 255, 255);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(48);
  
  const titleLines = pdf.splitTextToSize(title, A4_WIDTH_MM - 60);
  pdf.text(titleLines, A4_WIDTH_MM / 2, 60, { align: 'center' });

  // Subtitle with period
  const startYear = events[0]?.year || birthYear || 1970;
  const endYear = events[events.length - 1]?.year || new Date().getFullYear();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(18);
  pdf.setTextColor(180, 180, 180);
  pdf.text(`${startYear} – ${endYear}`, A4_WIDTH_MM / 2, 90, { align: 'center' });

  // Introduction text
  if (storyIntroduction) {
    pdf.setFontSize(14);
    pdf.setTextColor(200, 200, 200);
    const introLines = pdf.splitTextToSize(storyIntroduction, A4_WIDTH_MM - 80);
    pdf.text(introLines, A4_WIDTH_MM / 2, 110, { align: 'center' });
  }

  // Hero image from first event
  const firstEvent = events.find(e => e.imageUrl);
  if (firstEvent?.imageUrl) {
    try {
      const imgData = await loadImageAsDataUrl(firstEvent.imageUrl);
      if (imgData) {
        const imgWidth = 200;
        const imgHeight = (imgWidth * 9) / 16;
        const imgX = (A4_WIDTH_MM - imgWidth) / 2;
        const imgY = storyIntroduction ? 135 : 115;
        
        // Add rounded corners effect with clip
        pdf.addImage(imgData, 'JPEG', imgX, imgY, imgWidth, imgHeight);
      }
    } catch (err) {
      console.warn('Could not load cover image:', err);
    }
  }

  // Footer
  pdf.setFontSize(10);
  pdf.setTextColor(100, 100, 100);
  pdf.text('TimeStory Album', A4_WIDTH_MM / 2, A4_HEIGHT_MM - 15, { align: 'center' });
}

/**
 * Loads an image URL and returns it as a data URL
 */
async function loadImageAsDataUrl(url: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.referrerPolicy = 'no-referrer';
    
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        try {
          resolve(canvas.toDataURL('image/jpeg', 0.9));
        } catch {
          resolve(null);
        }
      } else {
        resolve(null);
      }
    };
    
    img.onerror = () => resolve(null);
    img.src = url;
  });
}

/**
 * Generates a StoryBook-style PDF using EventCard designs
 */
export async function generateStoryBookPdf(
  options: StoryBookPdfOptions,
  onProgress?: (progress: number) => void
): Promise<void> {
  const { events, formData } = options;

  // Create PDF in landscape orientation
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const totalSteps = events.length + 1; // +1 for cover
  let currentStep = 0;

  // Calculate period label
  const birthYear = formData.birthDate?.year || formData.yearRange?.startYear;
  const startYear = events[0]?.year || birthYear || 1970;
  const endYear = events[events.length - 1]?.year || new Date().getFullYear();
  const periodLabel = `${startYear}–${endYear}`;

  // Create cover page
  await createCoverPage(pdf, options);
  currentStep++;
  onProgress?.(Math.round((currentStep / totalSteps) * 100));

  // Render each event as a card
  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    
    try {
      // Render card to canvas
      const canvas = await renderEventCardToCanvas(event, i, periodLabel);
      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      // Add new page
      pdf.addPage();

      // Calculate position to center the card on the page
      const marginX = (A4_WIDTH_MM - CARD_PDF_WIDTH_MM) / 2;
      const marginY = (A4_HEIGHT_MM - CARD_PDF_HEIGHT_MM) / 2;

      // Add the card image
      pdf.addImage(imgData, 'JPEG', marginX, marginY, CARD_PDF_WIDTH_MM, CARD_PDF_HEIGHT_MM);

      // Add page number
      pdf.setFontSize(9);
      pdf.setTextColor(150, 150, 150);
      pdf.text(`${i + 1} / ${events.length}`, A4_WIDTH_MM - 15, A4_HEIGHT_MM - 8);

    } catch (err) {
      console.warn(`Failed to render event ${i}:`, err);
    }

    currentStep++;
    onProgress?.(Math.round((currentStep / totalSteps) * 100));
  }

  // Save the PDF
  const firstName = formData.optionalData?.firstName || 'TimeStory';
  const fileName = `${firstName}-Album.pdf`;
  pdf.save(fileName);
}
