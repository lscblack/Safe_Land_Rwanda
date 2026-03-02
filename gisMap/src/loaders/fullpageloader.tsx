

export const SafeLandLoader = ({ fullScreen = true }: { fullScreen?: boolean }) => {


  const containerClass = fullScreen
    ? "fixed inset-0 z-[100] flex flex-col items-center justify-center bg-gray-50 dark:bg-[#050c1a] transition-colors duration-300"
    : "flex flex-col items-center justify-center p-8 relative min-h-[200px]";

  const sizeClass = fullScreen ? "w-48 h-auto" : "w-32 h-auto";

  return (
    <div className={containerClass}>
      
      {/* 1. The Logo (Static & Clean) */}
      <div className={`${sizeClass} mb-8 relative`}>
        <img src='/logo_words.png' alt="SafeLand Rwanda Logo" className='animate-pulse duration-7'/>
      </div>

      {/* 2. Professional Spinner */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          {/* Background Ring (Light) */}
          <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700 opacity-30"></div>
          {/* Spinning Ring (Primary Color) */}
          <div className="absolute inset-0 rounded-full border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin"></div>
        </div>
        
        {/* Loading Text */}
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-widest animate-pulse">
          Loading
        </p>
      </div>

    </div>
  );
};

export default SafeLandLoader;