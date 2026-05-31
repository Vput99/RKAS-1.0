import React from 'react';

interface LogoRKASProps {
  className?: string;
}

const LogoRKAS: React.FC<LogoRKASProps> = ({ className = 'w-10 h-10' }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
    >
      <defs>
        {/* Gradients */}
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1e3a8a" /> {/* Dark Blue */}
          <stop offset="100%" stopColor="#0f172a" /> {/* Deep Indigo */}
        </linearGradient>
        <linearGradient id="cyanNeon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" /> {/* Sky 400 */}
          <stop offset="100%" stopColor="#22d3ee" /> {/* Cyan 400 */}
        </linearGradient>
        <linearGradient id="whiteGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#f1f5f9" /> {/* Slate 100 */}
        </linearGradient>
        
        {/* Glow Filters */}
        <filter id="neonGlow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* 1. White Outer Hexagon (Background) */}
      <polygon 
        points="72.5,11 27.5,11 5,50 27.5,89 72.5,89 95,50" 
        fill="url(#whiteGrad)" 
        stroke="#cbd5e1"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />

      {/* 2. Dark Blue Inner Hexagon */}
      <polygon 
        points="70,15 30,15 8,50 30,85 70,85 92,50" 
        fill="url(#bgGrad)" 
        stroke="#1e3a8a"
        strokeWidth="1"
        strokeLinejoin="round"
      />

      {/* 3. Cyan Outline Ring */}
      <polygon 
        points="68,18 32,18 11,50 32,82 68,82 89,50" 
        stroke="url(#cyanNeon)" 
        strokeWidth="2" 
        strokeLinejoin="round"
        filter="url(#neonGlow)"
        opacity="0.85"
      />

      {/* 4. The Letter "R" with dual outline for 3D/glow effect */}
      <path 
        d="M38,32 H54 C60,32 64,35 64,40 C64,45 60,48 54,48 H38 M38,32 V68 M38,48 H50 L62,68" 
        stroke="url(#cyanNeon)" 
        strokeWidth="6" 
        strokeLinecap="round" 
        strokeLinejoin="round"
        filter="url(#neonGlow)"
      />
      <path 
        d="M38,32 H54 C60,32 64,35 64,40 C64,45 60,48 54,48 H38 M38,32 V68 M38,48 H50 L62,68" 
        stroke="#ffffff" 
        strokeWidth="2" 
        strokeLinecap="round" 
        strokeLinejoin="round"
      />

      {/* 5. Internal Helix / Circuit details inside the R */}
      <line x1="43" y1="52" x2="43" y2="62" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <line x1="48" y1="55" x2="48" y2="62" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="43" cy="52" r="1.5" fill="#ffffff" />
      <circle cx="48" cy="55" r="1.5" fill="#ffffff" />
      
      {/* 6. Dots and lines around the hexagon (Circuit feel) */}
      <circle cx="72.5" cy="11" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="27.5" cy="11" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="5" cy="50" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="27.5" cy="89" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="72.5" cy="89" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />
      <circle cx="95" cy="50" r="2.5" fill="#22d3ee" filter="url(#neonGlow)" />

      {/* Circuit lines */}
      <line x1="68" y1="18" x2="72.5" y2="11" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="32" y1="18" x2="27.5" y2="11" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="11" y1="50" x2="5" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="32" y1="82" x2="27.5" y2="89" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="68" y1="82" x2="72.5" y2="89" stroke="#22d3ee" strokeWidth="1.5" />
      <line x1="89" y1="50" x2="95" y2="50" stroke="#22d3ee" strokeWidth="1.5" />
    </svg>
  );
};

export default LogoRKAS;
