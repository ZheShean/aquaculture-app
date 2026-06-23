import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 

export default function EventLog() {
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    // 1. Point to the 'logs' collection
    const logsRef = collection(db, 'logs');
    
    // 2. Fetch the 10 newest DOCUMENTS based on their timestamp field
    const q = query(logsRef, orderBy('timestamp', 'desc'), limit(10));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 3. Map through the 10 documents and extract their data
      const logData = snapshot.docs.map(doc => ({
        id: doc.id, // document name, e.g., '20260518_161640'
        ...doc.data() // This grabs the eventLogs and timestamp fields inside
      })).reverse();

      setLogs(logData);
    }, (error) => {
      console.error("Firebase Error in Event Log:", error.message);
    });

    return () => unsubscribe();
  }, []);

  // Create a reference for the scrollable container
  const logContainerRef = useRef(null);
  
  // Automatically scroll to the bottom whenever logs change
  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  // Helper function to format the native Firebase Timestamp into Malaysia Time
  const formatTime = (timestampObj) => {
    if (!timestampObj) return "Unknown Time";
    
    try {
      let date;
      // Check if it is a native Firebase Timestamp object
      if (typeof timestampObj.toDate === 'function') {
        date = timestampObj.toDate();
      } else {
        date = new Date(timestampObj);
      }
      
      // Force Malaysia time in 12-hour format
      return date.toLocaleString('en-US', {
        timeZone: 'Asia/Kuala_Lumpur',
        year:'numeric',
        month:'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (error) {
      console.error("Time parsing error:", error);
      return "Time Error"; 
    }
  };

  return (
    <div className="bg-white rounded-[3rem] p-8 shadow-sm flex flex-col h-[300px]">
      <h2 className="text-slate-800 font-bold text-medium mb-2">Event Log</h2>

      <div ref={logContainerRef} className="flex flex-col gap-5 overflow-y-auto pr-2 custom-scrollbar">
        {logs.length > 0 ? (
          logs.map((log) => (
            <div key={log.id} className="flex flex-col">
              <span className="text-slate-500 font-bold text-[13px] tracking-wide ">
                {formatTime(log.timestamp)}
              </span>
              <span className="text-slate-500 font-bold text-[13px] leading-snug">
                {log.eventLogs}
              </span>
            </div>
          ))
        ) : (
          <div className="text-slate-400 italic text-sm mt-2">
            No events logged yet.
          </div>
        )}
      </div>
    </div>
  );
}