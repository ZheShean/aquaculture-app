import React, { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 
import { Zap } from 'lucide-react';

export default function SystemStatus() {
  const [status, setStatus] = useState({
    battery: 0,
    boatstatus: 'OFF',
    basestation: false,
    aerator: false,
    waterpump: false,
    last_ping: null // Added to catch the incoming timestamp string
  });

  // NEW: Separate state to track live system health connection status
  const [systemHealth, setSystemHealth] = useState({
    connected: false,
    text: "OFFLINE",
    color: "text-red-500"
  });

  // 1. Listen to the specific document in Firestore
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

  // 2. NEW: Heartbeat timer that runs every single second to check for connection staleness
  useEffect(() => {
    const checkSystemHealth = () => {
      const lastPingStr = status.last_ping; // e.g., "2026-06-20T14:08:22"
      
      if (!lastPingStr) {
        setSystemHealth({ connected: false, text: "OFFLINE", color: "text-red-500" });
        return;
      }

      const lastPingTime = new Date(lastPingStr).getTime();
      const currentTime = new Date().getTime();

      // Calculate elapsed seconds since last hardware contact
      const secondsStale = (currentTime - lastPingTime) / 1000;
      const STALENESS_THRESHOLD = 15;

      if (secondsStale > STALENESS_THRESHOLD) {
        setSystemHealth({
          connected: false,
          text: "OFFLINE",
          color: "text-red-500"
        });
      } else {
        setSystemHealth({
          connected: true,
          text: "ONLINE",
          color: "text-emerald-500"
        });
      }
    };

    // Run immediately on data changes, then run every 1 second
    checkSystemHealth();
    const intervalId = setInterval(checkSystemHealth, 1000);

    return () => clearInterval(intervalId);
  }, [status.last_ping]); // Trigger loop re-evaluation whenever a new ping arrives

  // Helper function to render the ON/OFF text with the correct colors
  const renderToggleStatus = (isOn) => {
    return (
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm min-w-[95px] justify-center">
        {/* Blinking indicator dot */}
        <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
        <span className={`text-xs font-bold tracking-wider ${isOn ? 'text-emerald-500' : 'text-red-500'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    );
  };

  // Helper function to colorize the boat status text
  const getStatusColor = (boatStatusText) => {
    if (boatStatusText === 'CHARGING') return 'text-[#22c55e]'; 
    if (boatStatusText === 'MOVING') return 'text-blue-500';    
    if (boatStatusText === 'IDLE') return 'text-yellow-500';    
    return 'text-slate-400';                                    
  };

return (
    <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden flex flex-col justify-center">
      {/* CARD HEADER: Restored to clean, full title space without global badge */}
      <div className="absolute top-6 left-8">
        <h2 className="text-medium font-bold text-slate-900 mt-1">System Status</h2>
      </div>

      {/* Force side-by-side layout */}
      <div className="flex flex-row justify-center items-center w-full gap-4 md:gap-20 mt-14 md:mt-8">
        
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

        {/* RIGHT COLUMN: Realigned Rows matching design */}
        <div className="flex flex-col gap-2.5 w-full md:w-[280px] px-7 md:px-0">
          
          {/* Base Station Row: Evaluated dynamically using your 15s staleness logic */}
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900">Base Station</span>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm min-w-[95px] justify-center">
              <span className={`w-2 h-2 rounded-full ${systemHealth.connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500 animate-pulse'}`} />
              <span className={`text-xs font-bold tracking-wider ${systemHealth.connected ? 'text-emerald-500' : 'text-red-500'}`}>
                {systemHealth.text}
              </span>
            </div>
          </div>
          
          {/* Aerator Pump Row */}
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900">Aerator Pump</span>
            {renderToggleStatus(status.aerator)}
          </div>
          
          {/* Water Pump Row */}
          <div className="flex justify-between items-center w-full">
            <span className="text-medium font-semibold text-slate-900">Water Pump</span>
            {renderToggleStatus(status.waterpump)}
          </div>

        </div>
      </div>
    </div>
  );
}