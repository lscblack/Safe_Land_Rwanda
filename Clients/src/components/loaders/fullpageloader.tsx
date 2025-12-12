import React from 'react';
import { clsx } from 'clsx';

interface LoaderProps {
  fullScreen?: boolean;
  /** Controls width in non-fullscreen mode. Defaults to w-64. */
  className?: string;
}

export const SafeLandFullLoader: React.FC<LoaderProps> = ({ 
  fullScreen = false,
  className = "w-64"
}) => {
  const colors = {
    darkBlue: "#0f1f3a", 
    mediumBlue: "#4A729A"
  };

  // Use the light gray background from your image for fullscreen mode
  const containerClasses = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-[#F5F7FA] dark:bg-[#0f1f3a]"
    : clsx("flex items-center justify-center p-4", className);

  // Larger SVG size for fullscreen impact
  const svgClasses = fullScreen ? "w-80 md:w-96" : "w-full";

  return (
    <div className={containerClasses} aria-busy="true" aria-label="Loading SafeLand Rwanda">
      <style>
        {`
          @keyframes sl-breathe-full {
            0%, 100% { transform: scale(1); opacity: 1; }
            50% { transform: scale(0.98); opacity: 0.6; filter: grayscale(10%); }
          }
          .sl-anim-breathe-full {
            animation: sl-breathe-full 2.5s ease-in-out infinite;
            transform-origin: center;
          }
        `}
      </style>
      {/* Viewbox tuned for wide logo aspect ratio */}
      <svg 
        viewBox="0 0 320 100" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className={clsx(svgClasses, "sl-anim-breathe-full")}
      >
        {/* --- ICON SECTION (Reused geometry) --- */}
        <g transform="translate(5, 5) scale(0.9)">
           <circle cx="50" cy="50" r="44" stroke={colors.mediumBlue} strokeWidth="5"/>
           <mask id="circle-mask-full"><circle cx="50" cy="50" r="44" fill="white"/></mask>
           <g mask="url(#circle-mask-full)">
             <path d="M15 50 L50 22 L85 50" stroke={colors.mediumBlue} strokeWidth="5" strokeLinecap="round" fill="none"/> 
             <path d="M68 36 L68 28 L76 28 L76 43" stroke={colors.mediumBlue} strokeWidth="5" fill="none"/>
             <path d="M32 65 C 28 58, 32 45, 45 38 C 55 35, 65 38, 70 48 C 75 55, 72 68, 65 70 C 60 72, 58 75, 55 78 C 50 82, 40 80, 35 75 C 30 72, 25 70, 32 65 Z" fill={colors.darkBlue} />
             <path d="M20 78 Q 50 92 80 78" stroke={colors.mediumBlue} strokeWidth="4" fill="none" />
             <path d="M28 88 Q 50 98 72 88" stroke={colors.darkBlue} strokeWidth="4" fill="none" />
           </g>
        </g>

        {/* --- TEXT SECTION --- */}
        {/* Using standard fonts bolded to approximate brand font */}
        <g transform="translate(115, 35)">
          <text x="0" y="35" fill={colors.darkBlue} fontFamily="Arial, sans-serif" fontWeight="900" fontSize="48">SafeLand</text>
          <text x="0" y="78" fill={colors.mediumBlue} fontFamily="Arial, sans-serif" fontWeight="700" fontSize="34">Rwanda</text>
        </g>
      </svg>
    </div>
  );
};
export default SafeLandFullLoader;