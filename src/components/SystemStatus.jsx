import React, { useState, useEffect } from 'react';
import { doc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function SystemStatus() {
  const [status, setStatus] = useState({
    battery: 0,
    boatstatus: 'OFF',
    basestation: false,
    aerator: false,
    waterpump: false,
    last_ping: null 
  });

  // NEW: State to track the absolute latest data point's timestamp string from the 'main' collection
  const [lastMainTimestamp, setLastMainTimestamp] = useState(null);

  // NEW: State to override the boat status to "IDLE" if the 4-minute gap is breached
  const [derivedBoatStatus, setDerivedBoatStatus] = useState('IDLE');

  const [systemHealth, setSystemHealth] = useState({
    connected: false,
    text: "OFF",
    color: "text-red-500"
  });

  // Listener 1: Listen to the actuators document
  useEffect(() => {
    const docRef = doc(db, 'actuators', 'hardware_status');
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        setStatus(docSnap.data());
      }
    }, (error) => {
      console.error("Firebase Error in System Status:", error.message);
    });
    return () => unsubscribe();
  }, []);

  // NEW - Listener 2: Listen to the 'main' collection to get the absolute latest document timestamp
  useEffect(() => {
    const mainRef = collection(db, 'main');
    const q = query(mainRef, orderBy('timestamp', 'desc'), limit(1));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const latestData = snapshot.docs[0].data();
        setLastMainTimestamp(latestData.timestamp); // e.g., "2026-06-23T13:59:07"
      }
    }, (error) => {
      console.error("Firebase Error fetching latest main reading:", error.message);
    });
    return () => unsubscribe();
  }, []);

  // 3. Heartbeat Timer: Evaluates both Base Station health and ASV Idle Timeout every 1 second
  useEffect(() => {
    const runDiagnosticChecks = () => {
      const currentTime = new Date().getTime();

      // --- CHECK 1: BASE STATION HEALTH (15s Staleness) ---
      if (status.last_ping) {
        const lastPingTime = new Date(status.last_ping).getTime();
        if ((currentTime - lastPingTime) / 1000 > 15) {
          setSystemHealth({ connected: false, text: "OFF", color: "text-red-500" });
        } else {
          setSystemHealth({ connected: true, text: "ON", color: "text-emerald-500" });
        }
      } else {
        setSystemHealth({ connected: false, text: "OFF", color: "text-red-500" });
      }

      // --- CHECK 2: ASV IDLE TIMEOUT (4 Minute Check) ---
      if (!lastMainTimestamp) {
        setDerivedBoatStatus('IDLE');
        return;
      }

      const lastReadingTime = new Date(lastMainTimestamp).getTime();
      const minutesElapsed = (currentTime - lastReadingTime) / (1000 * 60);

      if (minutesElapsed >= 4) {
        // If 4 minutes or more have passed, force it to IDLE regardless of the field value
        setDerivedBoatStatus('IDLE');
      } else {
        // Otherwise, respect the real-time field value coming from Firestore
        setDerivedBoatStatus(status.boatstatus);
      }
    };

    runDiagnosticChecks();
    const intervalId = setInterval(runDiagnosticChecks, 1000);

    return () => clearInterval(intervalId);
  }, [status.last_ping, status.boatstatus, lastMainTimestamp]);

  const renderToggleStatus = (isOn) => {
    return (
      <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm min-w-[95px] justify-center">
        <span className={`w-2 h-2 rounded-full ${isOn ? 'bg-emerald-500 animate-ping' : 'bg-red-300 animate-none'}`} />
        <span className={`text-xs font-bold tracking-wider ${isOn ? 'text-emerald-500' : 'text-red-300'}`}>
          {isOn ? 'ON' : 'OFF'}
        </span>
      </div>
    );
  };

  // REFINED: Handles text colors and assigns the pulse animation classes dynamically
  const getASVStatusStyles = (boatStatusText) => {
    if (boatStatusText === 'MOVING') {
      return { colorClass: 'text-blue-500', animationClass: 'animate-pulse' };
    }
    if (boatStatusText === 'MEASURING') {
      return { colorClass: 'text-amber-500', animationClass: 'animate-pulse' }; 
    }
    return { colorClass: 'text-slate-400', animationClass: 'animate-none' }; 
  };

  const asvStyles = getASVStatusStyles(derivedBoatStatus);

  return (
    <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden flex flex-col justify-center">
      <div className="absolute top-6 left-8">
        <h2 className="text-medium font-bold text-slate-900 mt-1">System Status</h2>
      </div>

      <div className="flex flex-row justify-center items-center w-full gap-4 md:gap-20 mt-14 md:mt-8">
        
        {/* LEFT COLUMN: ASV Status Display Block */}
        <div className="flex flex-col items-center">
          <span className="text-slate-800 font-bold text-medium text-center mb-3 leading-tight select-none">
            ASV <br /> Status
          </span>
           
        {/* FIXED-WIDTH WRAPPER: Prevents text width changes from pushing the right column */}
        <div className="w-[130px] flex justify-center items-center">
          <span className={`${asvStyles.colorClass} ${asvStyles.animationClass} font-extrabold tracking-wider uppercase text-xl transition-all block text-center`}>
            {derivedBoatStatus}
          </span>
          </div>
        </div>

        {/* RIGHT COLUMN: Realigned Rows matching design */}
        <div className="flex flex-col gap-2.5 w-full md:w-[280px] px-7 md:px-0">
          
          {/* Base Station Row */}
          <div className="flex justify-between items-center w-full">
            <span className="text-[15px] font-bold text-slate-900">Base Station</span>
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1 rounded-full border border-slate-100 shadow-sm min-w-[95px] justify-center">
              <span className={`w-2 h-2 rounded-full ${systemHealth.connected ? 'bg-emerald-500 animate-ping' : 'bg-red-300 animate-none'}`} />
              <span className={`text-xs font-bold tracking-wider ${systemHealth.connected ? 'text-emerald-500' : 'text-red-300'}`}>
                {systemHealth.text}
              </span>
            </div>
          </div>
          
          {/* Aerator Pump Row */}
          <div className="flex justify-between items-center w-full">
            <span className="text-[15px] font-bold text-slate-900">Aerator Pump</span>
            {renderToggleStatus(status.aerator)}
          </div>
          
          {/* Water Pump Row */}
          <div className="flex justify-between items-center w-full">
            <span className="text-[15px] font-bold text-slate-900">Water Pump</span>
            {renderToggleStatus(status.waterpump)}
          </div>

        </div>
      </div>
    </div>
  );
}