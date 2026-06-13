import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function FishActivity() {
  const [objDetected, setObjDetected] = useState(false);
  
  // NEW: State to track the 5-second ignore window
  const [isResolving, setIsResolving] = useState(false);

  useEffect(() => {
    const docRef = doc(db, 'actuators', 'hardware_status');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setObjDetected(docSnap.data().objdetect);
      }
    }, (error) => {
      console.error("Firebase Error in Fish Activity:", error.message);
    });

    return () => unsubscribe();
  }, []);

  const handleResolveClick = async () => {
    try {
      // 1. Immediately force the UI into the "ALL GOOD" state
      setIsResolving(true);

      // 2. Write the flag to Firestore: actuators > objdetect_flag > isResolve: true
      const flagRef = doc(db, 'actuators', 'objdetect_flag');
      await setDoc(flagRef, { isResolve: true }, { merge: true });
      
      // 3. Set a 5-second timer. After 5 seconds, turn off the override.
      setTimeout(() => {
        setIsResolving(false);
      }, 5000);

    } catch (error) {
      console.error("Error sending resolve signal: ", error);
      setIsResolving(false); //internet fails, revert back to normal
    }
  };

  // Show alert ONLY if object is detected AND aren't in the 5-second resolve pause.
  const showAlert = objDetected && !isResolving;

  return (
    <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden flex flex-col items-center justify-center min-h-[220px]">
      
      {/* Title */}
      <div className="absolute top-6 left-8">
        <h2 className="text-slate-800 font-bold text-lg">Fish Activity</h2>
      </div>

      <div className="mt-6 flex flex-col items-center justify-center text-center w-full">
        
        {/* CHANGED: Now evaluates the new `showAlert` variable instead of just `objDetected` */}
        {showAlert ? (
            <div className="flex flex-col items-center">
                <style>
                    {`
                    @keyframes heartbeat {
                        0%, 100% { transform: scale(1); opacity: 1; }
                        50% { transform: scale(1.08); opacity: 0.8; }
                    }
                    .animate-heartbeat {
                        animation: heartbeat 1.2s ease-in-out infinite;
                    }
                    `}
                </style>
                <h3 className="text-red-600 font-bold text-3xl tracking-wide animate-heartbeat mb-4">
                    OBJECT DETECTED
                </h3>
                
                <p className="text-slate-500 font-medium text-sm leading-relaxed mb-6">
                    *ALERT:<br/>
                    It might be dead fish or floating object.<br/>
                    Please remove it quickly to preserve water quality.
                </p>

                {/* CHANGED: Attached the handleResolveClick function here */}
                <div 
                  onClick={handleResolveClick}
                  className="w-32 h-10 bg-sky-300 rounded-xl flex items-center justify-center text-slate-700 font-semibold cursor-pointer hover:bg-sky-400 transition-colors"
                >
                    Resolved
                </div>
            </div>
        ) : (
            <div>
                <h3 className="text-green-500 font-bold text-3xl tracking-wide mb-2">
                    ALL GOOD
                </h3>
                <p className="text-slate-400 font-medium text-sm">
                    No unusual objects detected in the water.
                </p>
            </div>
        )}

      </div>
    </div>
  );
}