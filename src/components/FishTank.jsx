import React, { useEffect, useState } from 'react';

export default function FishTank() {
  const [currentTime, setCurrentTime] = useState('');

  // Live Clock Logic
  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      let hours = now.getHours();
      const ampm = hours >= 12 ? 'P.M.' : 'A.M.';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      const mins = String(now.getMinutes()).padStart(2, '0');
      
      setCurrentTime(`${yyyy}.${mm}.${dd} ${hours}.${mins} ${ampm}`);
    };
    
    updateClock(); 
    const clockInterval = setInterval(updateClock, 60000); 
    return () => clearInterval(clockInterval);
  }, []);

  return (
    <div className="relative w-full h-[120px] bg-[#fefce8] border border-slate-200 shadow-sm rounded-[2rem] overflow-hidden">
        
        {/* 1. EMBEDDED SMOOTH SWIMMING CSS ANIMATION */}
        <style>{`
          @keyframes ambient-swim {
            0% { transform: translateX(-150px) translateY(15px) scaleX(1); }
            45% { transform: translateX(1200px) translateY(5px) scaleX(1); }
            50% { transform: translateX(1200px) translateY(5px) scaleX(-1); } 
            95% { transform: translateX(-150px) translateY(15px) scaleX(-1); }
            100% { transform: translateX(-150px) translateY(15px) scaleX(1); } 
          }
          @keyframes tail-wag {
            0%, 100% { transform: rotate(0deg); }
            50% { transform: rotate(8deg); }
          }
          
          /* Different swimming speeds and starting positions! */
          .fish-1 { animation: ambient-swim 30s infinite ease-in-out; }
          .fish-2 { animation: ambient-swim 45s infinite ease-in-out -15s; } /* -15s makes it start in the middle of the screen */
          .fish-3 { animation: ambient-swim 25s infinite ease-in-out -7s; }
          
          .animate-tail {
            animation: tail-wag 0.6s infinite ease-in-out;
            transform-origin: 30% 50%;
          }
        `}</style>

        {/* 2. THE MULTI-FISH LAYER */}
        <div className="absolute inset-0 z-0 pointer-events-none">
            
            {/* Fish 1: The Original Blue (Medium speed, middle layer) */}
            <svg 
              className="fish-1 absolute top-4 w-16 h-16 text-blue-300 opacity-60" 
              viewBox="0 0 24 24" fill="currentColor"
            >
              <path d="M2,12 C5,8 13,7 19,12 C13,17 5,16 2,12 Z" />
              <path d="M12,9 C11,6 8,7 9,10 Z" />
              <path className="animate-tail" d="M3,12 L1,9 L2,12 L1,15 Z" />
            </svg>

            {/* Fish 2: Small Orange (Slower, further back in the tank) */}
            <svg 
              className="fish-2 absolute top-10 w-10 h-10 text-orange-300 opacity-40" 
              viewBox="0 0 24 24" fill="currentColor"
            >
              <path d="M2,12 C5,8 13,7 19,12 C13,17 5,16 2,12 Z" />
              <path d="M12,9 C11,6 8,7 9,10 Z" />
              <path className="animate-tail" style={{animationDuration: '0.8s'}} d="M3,12 L1,9 L2,12 L1,15 Z" />
            </svg>

            {/* Fish 3: Large Teal (Faster, swimming closer to the glass) */}
            <svg 
              className="fish-3 absolute -top-2 w-20 h-20 text-teal-200 opacity-30" 
              viewBox="0 0 24 24" fill="currentColor"
            >
              <path d="M2,12 C5,8 13,7 19,12 C13,17 5,16 2,12 Z" />
              <path d="M12,9 C11,6 8,7 9,10 Z" />
              <path className="animate-tail" style={{animationDuration: '0.4s'}} d="M3,12 L1,9 L2,12 L1,15 Z" />
            </svg>

        </div>

        {/* 3. FOREGROUND TEXT LAYER (Sits on top at z-10) */}
        <div className="absolute inset-0 flex items-center justify-between px-10 pointer-events-none z-10">
            
            {/* Left Box: Logo & C1G12 */}
            <div className="flex flex-col items-start mt-4 select-none">
                <div 
                  onClick={() => window.location.reload()}
                  className="relative cursor-pointer pointer-events-auto group active:scale-95 transition-transform"
                  title="Click to refresh dashboard"
                >
                    <span className="text-4xl font-black text-[#3f3e97] tracking-widest relative z-10 transition-colors group-hover:text-blue-700" style={{ textShadow: '1px 1px 0px white' }}>
                        F.I.S.H.E.S
                    </span>
                    <div className="absolute bottom-0 left-0 w-full h-3 border-b-4 border-[#a5d6d9] border-dotted opacity-70 z-0 transform translate-y-1"></div>
                </div>
                <span className="text-slate-500 font-bold text-lg mt-1 tracking-wider">C1G12</span>
            </div>

            {/* Center Box: Date and Time */}
            <div className="text-slate-500 font-medium text-lg pt-4 tracking-wide">
                {currentTime}
            </div>

            {/* Right Box: Empty space */}
            <div className="w-32"></div>
        </div>

    </div>
  );
}