import React from 'react';

export const SplashScreen = () => {
  return (
    <div className="fixed inset-0 bg-background z-50 flex items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        {/* Mosque icon using CSS */}
        <div className="w-16 h-16 relative">
          <svg 
            viewBox="0 0 100 100" 
            className="w-full h-full text-primary animate-pulse"
            fill="currentColor"
          >
            {/* Simple mosque silhouette */}
            <path d="M20 80 L20 60 L25 55 L25 45 L30 40 L35 45 L35 55 L40 60 L40 80 Z" />
            <path d="M60 80 L60 60 L65 55 L65 45 L70 40 L75 45 L75 55 L80 60 L80 80 Z" />
            <path d="M35 80 L35 50 L40 45 L45 40 L50 35 L55 40 L60 45 L65 50 L65 80 Z" />
            <circle cx="45" cy="25" r="3" />
            <rect x="48" y="20" width="1" height="10" />
            <circle cx="55" cy="25" r="3" />
            <rect x="58" y="20" width="1" height="10" />
          </svg>
        </div>
        
        {/* Loading indicator */}
        <div className="w-8 h-1 bg-muted rounded-full overflow-hidden">
          <div className="w-full h-full bg-primary rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};