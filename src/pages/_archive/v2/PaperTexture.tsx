import { type EraType } from "@/lib/eraThemes";

interface PaperTextureProps {
  era: EraType;
}

export const PaperTexture = ({ era }: PaperTextureProps) => {
  // Era-specific background styles
  const getBackgroundStyle = () => {
    switch (era) {
      case 'pre70s':
        return {
          background: '#f5f0e6',
          // Paper grain texture via SVG
        };
      case '70s':
        return {
          background: 'linear-gradient(180deg, #fdf5e6 0%, #f5e6d3 100%)',
        };
      case '80s':
        return {
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f0f1a 100%)',
        };
      case '90s':
        return {
          background: '#ffffff',
        };
      case '2000s':
        return {
          background: 'linear-gradient(180deg, #f8f8f8 0%, #e8e8e8 100%)',
        };
      default:
        return {
          background: '#fafafa',
        };
    }
  };
  
  return (
    <>
      {/* Base color layer */}
      <div 
        className="fixed inset-0 -z-30 transition-all duration-700"
        style={getBackgroundStyle()}
      />
      
      {/* Paper grain texture - more visible for vintage eras */}
      {(era === 'pre70s' || era === '70s') && (
        <div 
          className="fixed inset-0 -z-20 opacity-30 mix-blend-multiply pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
          }}
        />
      )}
      
      {/* 80s grid pattern */}
      {era === '80s' && (
        <div 
          className="fixed inset-0 -z-20 opacity-20 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,20,147,0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,20,147,0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px',
          }}
        />
      )}
      
      {/* 90s Memphis pattern - playful shapes */}
      {era === '90s' && (
        <div className="fixed inset-0 -z-20 opacity-10 pointer-events-none overflow-hidden">
          {/* Scattered geometric shapes */}
          <div className="absolute top-[10%] left-[5%] w-20 h-20 rounded-full bg-[#0066cc]" />
          <div className="absolute top-[20%] right-[15%] w-16 h-16 bg-[#ffcc00] rotate-45" />
          <div className="absolute top-[60%] left-[10%] w-12 h-12 rounded-full bg-[#ff3366]" />
          <div className="absolute bottom-[20%] right-[8%] w-24 h-24 bg-[#0066cc] rotate-12" />
          <div className="absolute top-[40%] left-[70%] w-8 h-8 rounded-full border-4 border-[#ffcc00]" />
          <div className="absolute bottom-[40%] left-[30%] w-10 h-10 bg-[#ff3366] -rotate-12" />
          
          {/* Zigzag lines */}
          <svg className="absolute top-[30%] left-[20%] w-32 h-8 text-[#ffcc00]" viewBox="0 0 100 20">
            <path d="M0 10 L10 0 L20 10 L30 0 L40 10 L50 0 L60 10 L70 0 L80 10 L90 0 L100 10" 
              stroke="currentColor" strokeWidth="2" fill="none" />
          </svg>
        </div>
      )}
      
      {/* 2000s dots pattern */}
      {era === '2000s' && (
        <div 
          className="fixed inset-0 -z-20 opacity-20 pointer-events-none"
          style={{
            backgroundImage: 'radial-gradient(circle, #333 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        />
      )}
      
      {/* Subtle vignette for all eras */}
      <div 
        className="fixed inset-0 -z-10 pointer-events-none"
        style={{
          background: era === '80s'
            ? 'radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.4) 100%)'
            : 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.08) 100%)',
        }}
      />
    </>
  );
};
