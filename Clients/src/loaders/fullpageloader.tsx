const SafeLandLoaderEnhanced = ({ fullScreen = true }: { fullScreen?: boolean }) => {
  // Brand Colors based on the reference image
  const PRIMARY_BLUE = "#3F6B9D"; // The medium blue color (Ring, Roof, Fields)
  const DARK_NAVY = "#0C1C38";    // The very dark navy color (Map, Text)

  const containerClass = fullScreen
    ? "fixed inset-0 z-50 flex items-center justify-center bg-gray-50 dark:bg-gray-900"
    : "flex items-center justify-center p-8 relative bg-gray-50 rounded-xl";

  // Slightly larger default size to show off detail
  const sizeClass = fullScreen ? "w-96 h-auto" : "w-64 h-auto";

  return (
    <div className={containerClass}>
      <div className="relative flex flex-col items-center">
        <svg
          className={sizeClass}
          viewBox="0 0 240 280"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Loading SafeLand Rwanda"
          style={{ overflow: 'visible' }}
        >
          <defs>
             {/* Define the Map Path once for reuse in clipPath and final rendering if needed */}
            <path
              id="rwanda-map-path"
              d="M 75 145 
                 C 68 135, 70 125, 82 120 
                 L 82 105 
                 L 90 100 L 98 105 L 115 85 
                 L 145 70 
                 L 155 95 L 160 115 
                 C 160 135, 145 150, 125 160 
                 C 105 168, 85 155, 75 145 Z"
            />

            <clipPath id="map-clip">
              <use href="#rwanda-map-path" />
            </clipPath>

            <style>
              {`
                /* --- ANIMATION KEYFRAMES --- */
                
                /* 1. Line Drawing (Ring, Roof, Fields) */
                @keyframes drawLineGentle {
                  to { stroke-dashoffset: 0; }
                }

                /* 2. Liquid Fill for Map */
                @keyframes liquidFillUp {
                  from { transform: translateY(180px); }
                  to { transform: translateY(0); }
                }

                /* 3. Text Reveal */
                @keyframes fadeSlideUp { 
                  from { opacity: 0; transform: translateY(15px); } 
                  to { opacity: 1; transform: translateY(0); } 
                }

                /* --- CLASS STYLES --- */

                /* General thicker lines to match logo */
                .sl-thick-stroke {
                  stroke-width: 18px;
                  stroke-linecap: round;
                  stroke-linejoin: round;
                }

                /* The animated lines */
                .sl-draw-anim {
                  stroke-dasharray: 600;
                  stroke-dashoffset: 600;
                  animation: drawLineGentle 2.2s cubic-bezier(0.4, 0, 0.2, 1) forwards;
                }

                /* The "liquid" filling the map */
                .sl-map-filler {
                  fill: ${DARK_NAVY};
                  /* Start below the map area */
                  transform: translateY(180px); 
                  animation: liquidFillUp 1.5s cubic-bezier(0.4, 0, 0.2, 1) 0.8s forwards;
                }

                /* Field delays */
                .sl-field-1 { animation-delay: 0.3s; }
                .sl-field-2 { animation-delay: 0.5s; }

                /* Text container */
                .sl-text-container {
                  opacity: 0;
                  animation: fadeSlideUp 0.8s ease-out 1.8s forwards;
                }
              `}
            </style>
          </defs>

          {/* --- GROUP 1: THE ICON --- */}
          <g transform="translate(20, 20)">
            
            {/* A. The Outer Ring (Thick) */}
            <circle 
              cx="100" cy="100" r="90" 
              fill="none" 
              stroke={PRIMARY_BLUE} 
              className="sl-thick-stroke sl-draw-anim"
            />

            {/* B. The Map (Liquid Fill Effect) */}
            {/* We use the clip-path to contain the rising "liquid" rectangle */}
            <g clipPath="url(#map-clip)">
               <rect 
                 x="50" y="50" width="120" height="130" 
                 className="sl-map-filler"
               />
            </g>
            {/* Optional: Add a faint outline to the map for definition before it fills */}
             <use href="#rwanda-map-path" fill="none" stroke={DARK_NAVY} strokeWidth="1" opacity="0.1" />


            {/* C. House Roof & Chimney (Thick & Connected) */}
            <path
              d="M 25 85 L 100 30 L 175 85 M 138 58 L 138 38 L 158 38 L 158 72"
              fill="none"
              stroke={PRIMARY_BLUE}
              className="sl-thick-stroke sl-draw-anim"
              style={{ strokeLinecap: 'square' }} // Chimney looks better square
            />

            {/* D. Fields (Thick, Curved, Sequential) */}
            <path 
              d="M 45 150 Q 100 190 155 150"
              fill="none"
              stroke={PRIMARY_BLUE}
              className="sl-thick-stroke sl-draw-anim sl-field-1"
            />
             <path 
              d="M 65 175 Q 100 195 135 175"
              fill="none"
              stroke={PRIMARY_BLUE}
              className="sl-thick-stroke sl-draw-anim sl-field-2"
            />
          </g>

          {/* --- GROUP 2: TEXT BRANDING --- */}
          <g className="sl-text-container">
            <text 
              x="120" y="240" 
              textAnchor="middle" 
              fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" 
              fontWeight="800" 
              fontSize="38" 
              fill={DARK_NAVY}
            >
              SafeLand
            </text>
            <text 
              x="120" y="265" 
              textAnchor="middle" 
              fontFamily="'Helvetica Neue', Helvetica, Arial, sans-serif" 
              fontWeight="700" 
              fontSize="24" 
              fill={PRIMARY_BLUE}
              letterSpacing="2"
            >
              RWANDA
            </text>
          </g>
        </svg>
        
        {/* --- GROUP 3: LOADING INDICATOR (HTML beneath SVG) --- */}
        {/* Using HTML for the dots allows for easier standardized animations */}
        <div className="absolute -bottom-8 flex flex-col items-center animate-pulse delay-1000">
           {/* Enhanced Wave Dots */}
           <div className="flex gap-2">
              {[0, 1, 2].map((i) => (
                  <div 
                    key={i}
                    className="w-3 h-3 rounded-full animate-bounce"
                    style={{ 
                        backgroundColor: i === 1 ? PRIMARY_BLUE : DARK_NAVY,
                        animationDelay: `${i * 0.15}s`,
                        animationDuration: '1s'
                    }}
                  ></div>
              ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SafeLandLoaderEnhanced;