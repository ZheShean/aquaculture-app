import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 
import { Zap } from 'lucide-react';

export default function SystemStatus() {
  // 1. Set default states to prevent errors before data loads
  const [status, setStatus] = useState({
    battery: 0,
    boatstatus: 'OFF',
    basestation: false,
    aerator: false,
    waterpump: false
  });

  // 2. Listen to the specific document in Firestore
  useEffect(() => {
    const docRef = doc(db, 'actuators', 'hardware_status');
    
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStatus(docSnap.data());
      } else {
        console.log("No hardware_status document found!");
      }
    }, (error) => {
      console.error("Firebase Error in System Status:", error.message);
    });

    return () => unsubscribe();
  }, []);

  // Helper function to render the ON/OFF text with the correct colors
  const renderToggleStatus = (isOn) => {
    return isOn ? (
      <span className="text-[#22c55e] font-bold text-2xl tracking-wide">ON</span>
    ) : (
      <span className="text-slate-400 font-bold text-2xl tracking-wide">OFF</span>
    );
  };

  // Helper function to colorize the boat status text
  const getStatusColor = (boatStatusText) => {
    if (boatStatusText === 'CHARGING') return 'text-[#22c55e]'; // Green
    if (boatStatusText === 'MOVING') return 'text-blue-500';    // Blue
    if (boatStatusText === 'IDLE') return 'text-yellow-500';    // Yellow
    return 'text-slate-400';                                    // Gray for OFF
  };

return (
    <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden flex flex-col justify-center">
      <div className="absolute top-6 left-8">
        <h2 className="text-medium font-bold text-slate-900 mt-1">System Status</h2>
      </div>

      {/*  force side-by-side on desktop */}
      <div className="flex flex-row justify-center items-center w-full gap-4 md:gap-20 mt-10 md:mt-6">
        
        {/* LEFT COLUMN: Battery & Boat Status */}
        <div className="flex flex-col items-center">
          <span className="text-slate-800 font-bold text-medium text-center mb-3 leading-tight">
            Boat Battery<br />Percentage
          </span>
          
          <div className="bg-[#22c55e] text-white rounded-[2rem] px-4 py-2 flex items-center gap-1 mb-2 shadow-sm">
            <span className="text-3xl font-semibold">{status.battery}</span>
            <Zap className="w-7 h-7 fill-current" />
          </div>
          
          <span className={`${getStatusColor(status.boatstatus)} font-bold tracking-wider uppercase text-xl`}>
            {status.boatstatus}
          </span>
        </div>

        {/* RIGHT COLUMN: Toggles */}
        {/* CHANGED: Constrained width to 280px and used w-full inside to bring texts closer */}
        <div className="flex flex-col gap-0.5 w-full md:w-[280px] px-7 md:px-0">
          
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900 mt-1">Base Station</span>
            {renderToggleStatus(status.basestation)}
          </div>
          
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900 mt-1">Aerator Pump</span>
            {renderToggleStatus(status.aerator)}
          </div>
          
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900 mt-1">Water Pump</span>
            {renderToggleStatus(status.waterpump)}
          </div>

        </div>
      </div>
    </div>
  );
}