import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceArea, Tooltip } from 'recharts';
import { collection, query, orderBy, where, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path if needed

export default function SensorMetrics() {
  const [latestData, setLatestData] = useState({ temperature: 0, pH: 0, EC: 0 });
  
  // 3 Separate Data Arrays for the Graphs
  const [tempData, setTempData] = useState([]);
  const [phData, setPhData] = useState([]);
  const [ecData, setEcData] = useState([]);

  // 3 Separate Selected Datetime Strings (Format: YYYY-MM-DDTHH:MM)
  const [tempTime, setTempTime] = useState("");
  const [phTime, setPhTime] = useState("");
  const [ecTime, setEcTime] = useState("");

  // 1. Live Real-time Numbers Listener (Always grabs the newest single document)
  useEffect(() => {
    const q = query(collection(db, 'main'), orderBy('timestamp', 'desc'), limit(1));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestData(snapshot.docs[0].data());
      }
    });
    return () => unsubscribe();
  }, []);

  // Shared Helper Function to process Firestore query arrays & handle connection gaps
  const processSnapshot = (snapshot, isLive) => {
    if (snapshot.empty) return [];
    
    const records = snapshot.docs.map((docSnap) => {
      const docData = docSnap.data();
      let displayTime = '';
      if (docData.timestamp) {
        const timePart = docData.timestamp.split('T')[1];
        if (timePart) displayTime = timePart.substring(0, 5);
      }
      return {
        rawTimestamp: docData.timestamp,
        time: displayTime,
        temperature: docData.temperature !== undefined ? docData.temperature : null,
        pH: docData.pH !== undefined ? docData.pH : null,
        EC: docData.EC !== undefined ? docData.EC : null
      };
    });

    const chronologicalRecords = records.reverse();
    const processedRecords = [];
    const GAP_THRESHOLD_MS = 90 * 60 * 1000; // 1h 30m

    for (let i = 0; i < chronologicalRecords.length; i++) {
      processedRecords.push(chronologicalRecords[i]);
      if (i < chronologicalRecords.length - 1) {
        const currentMs = new Date(chronologicalRecords[i].rawTimestamp).getTime();
        const nextMs = new Date(chronologicalRecords[i + 1].rawTimestamp).getTime();
        if (nextMs - currentMs > GAP_THRESHOLD_MS) {
          processedRecords.push({ time: '', temperature: null, pH: null, EC: null });
        }
      }
    }

    // Append Offline flag ONLY if viewing live data
    if (isLive && chronologicalRecords.length > 0) {
      const lastRecord = chronologicalRecords[chronologicalRecords.length - 1];
      if (lastRecord && lastRecord.rawTimestamp) {
        const lastLogTimeMs = new Date(lastRecord.rawTimestamp).getTime();
        if (Date.now() - lastLogTimeMs > GAP_THRESHOLD_MS) {
          processedRecords.push({ time: 'Offline', temperature: null, pH: null, EC: null });
        }
      }
    }
    return processedRecords;
  };

  // Helper to generate ISO string windows for queries
  const getQueryWindow = (selectedTime) => {
    const pad = (n) => n.toString().padStart(2, '0');
    const formatISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:00`;

    if (!selectedTime) {
      // Default: Last 24 hours up to right now
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return { start: formatISO(yesterday), end: null };
    } else {
      // History: Selected time up to 24 hours forward
      const start = new Date(selectedTime);
      const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
      return { start: formatISO(start), end: formatISO(end) };
    }
  };

  // 2. TEMPERATURE Graph Query Listener
  useEffect(() => {
    const window = getQueryWindow(tempTime);
    let q = query(collection(db, 'main'), where('timestamp', '>=', window.start), orderBy('timestamp', 'desc'));
    if (window.end) q = query(q, where('timestamp', '<=', window.end));

    return onSnapshot(q, (snapshot) => setTempData(processSnapshot(snapshot, !tempTime)));
  }, [tempTime]);

  // 3. pH Graph Query Listener
  useEffect(() => {
    const window = getQueryWindow(phTime);
    let q = query(collection(db, 'main'), where('timestamp', '>=', window.start), orderBy('timestamp', 'desc'));
    if (window.end) q = query(q, where('timestamp', '<=', window.end));

    return onSnapshot(q, (snapshot) => setPhData(processSnapshot(snapshot, !phTime)));
  }, [phTime]);

  // 4. SALINITY Graph Query Listener
  useEffect(() => {
    const window = getQueryWindow(ecTime);
    let q = query(collection(db, 'main'), where('timestamp', '>=', window.start), orderBy('timestamp', 'desc'));
    if (window.end) q = query(q, where('timestamp', '<=', window.end));

    return onSnapshot(q, (snapshot) => setEcData(processSnapshot(snapshot, !ecTime)));
  }, [ecTime]);

  const getTempStatus = (val) => {
    if (val >= 25 && val <= 27) return { text: 'Normal', bg: 'bg-green-200', color: 'text-green-800' };
    if (val > 27 && val <= 32) return { text: 'Alert', bg: 'bg-yellow-200', color: 'text-yellow-800' };
    return { text: 'Danger', bg: 'bg-red-200', color: 'text-red-800' };
  };

  const getPhStatus = (val) => {
    if (val >= 7 && val <= 8) return { text: 'Normal', bg: 'bg-green-200', color: 'text-green-800' };
    if ((val >= 6.5 && val < 7) || (val > 8 && val <= 8.5)) return { text: 'Alert', bg: 'bg-yellow-200', color: 'text-yellow-800' };
    return { text: 'Danger', bg: 'bg-red-200', color: 'text-red-800' };
  };

  const getEcStatus = (val) => {
    if (val >= 0 && val <= 1.5) return { text: 'Normal', bg: 'bg-green-200', color: 'text-green-800' };
    if (val > 1.5 && val <= 2.5) return { text: 'Alert', bg: 'bg-yellow-200', color: 'text-yellow-800' };
    return { text: 'Danger', bg: 'bg-red-200', color: 'text-red-800' };
  };

  const tempStatus = getTempStatus(latestData.temperature);
  const phStatus = getPhStatus(latestData.pH);
  const ecStatus = getEcStatus(latestData.EC);

  const CustomTooltip = ({ active, payload, unit, labelName }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      if (data.time === 'Offline' || data.time === '') return null;
      let dateStr = "", timeStr = "";
      if (data.rawTimestamp) {
        const parts = data.rawTimestamp.split('T');
        dateStr = parts[0];
        timeStr = parts[1] ? parts[1].substring(0, 5) : "";
      }
      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-xl text-sm z-50">
          <p className="text-slate-500 mb-1">Date: <span className="font-semibold text-slate-700">{dateStr}</span></p>
          <p className="text-slate-500 mb-2">Time: <span className="font-semibold text-slate-700">{timeStr}</span></p>
          <p className="font-bold text-slate-800">{labelName}: {payload[0].value} {unit}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      
      {/* 1. TEMPERATURE CARD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <img src="/temp-icon.png" alt="Temperature Icon" className="w-14 h-14 object-contain" />
          <div className="flex flex-col items-end gap-1">
            <span className="text-medium font-bold text-slate-900">Temperature</span>
            <div className="flex items-center gap-1">
              <input type="datetime-local" value={tempTime} onChange={(e) => setTempTime(e.target.value)} className="text-xs border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-slate-600 focus:outline-none max-w-[130px]"/>
              {tempTime && <button onClick={() => setTempTime("")} className="text-xs text-red-500 font-bold px-1">✕</button>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-800">{latestData.temperature}</span>
            <span className="text-slate-500 text-sm">°C</span>
          </div>
        </div>

        <div className="w-full h-28 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tempData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              <YAxis domain={[20, 40]} ticks={[20, 25, 32, 40]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              <ReferenceArea y1={40} y2={32} fill="#fee2e2" fillOpacity={0.6} />
              <ReferenceArea y1={25} y2={20} fill="#fee2e2" fillOpacity={0.6} />
              <Tooltip trigger="hover" content={<CustomTooltip unit="°C" labelName="Temperature" />} />
              <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. pH LEVEL CARD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <img src="/ph-icon.png" alt="pH Icon" className="w-14 h-14 object-contain" />
          <div className="flex flex-col items-end gap-1">
            <span className="text-medium font-bold text-slate-900">pH Level</span>
            <div className="flex items-center gap-1">
              <input type="datetime-local" value={phTime} onChange={(e) => setPhTime(e.target.value)} className="text-xs border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-slate-600 focus:outline-none max-w-[130px]"/>
              {phTime && <button onClick={() => setPhTime("")} className="text-xs text-red-500 font-bold px-1">✕</button>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <span className="text-4xl font-bold text-slate-800">{latestData.pH}</span>
        </div>

        <div className="w-full h-28 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={phData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              <YAxis domain={[5, 10]} ticks={[5, 6.5, 8.5, 10]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              <ReferenceArea y1={10} y2={8.5} fill="#fee2e2" fillOpacity={0.6} />
              <ReferenceArea y1={6.5} y2={5} fill="#fee2e2" fillOpacity={0.6} />
              <Tooltip trigger="hover" content={<CustomTooltip unit="pH" labelName="pH Level" />} />
              <Area type="monotone" dataKey="pH" stroke="#a855f7" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. SALINITY LEVEL CARD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <img src="/salinity-icon.png" alt="Salinity Icon" className="w-14 h-14 object-contain" />
          <div className="flex flex-col items-end gap-1">
            <span className="text-medium font-bold text-slate-900">Salinity Level</span>
            <div className="flex items-center gap-1">
              <input type="datetime-local" value={ecTime} onChange={(e) => setEcTime(e.target.value)} className="text-xs border border-slate-200 rounded-lg p-0.5 bg-slate-50 text-slate-600 focus:outline-none max-w-[130px]"/>
              {ecTime && <button onClick={() => setEcTime("")} className="text-xs text-red-500 font-bold px-1">✕</button>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-800">{latestData.EC}</span>
            <span className="text-slate-500 text-xs">mS/cm</span>
          </div>
        </div>

        <div className="w-full h-40 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={ecData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              <YAxis domain={[0, 2.5]} ticks={[0, 0.25, 1.25, 2.5]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              <ReferenceArea y1={2.5} y2={1.5} fill="#fee2e2" fillOpacity={0.6} />
              <Tooltip trigger="hover" content={<CustomTooltip unit="mS/cm" labelName="Salinity Level" />} />
              <Area type="monotone" dataKey="EC" stroke="#06b6d4" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}