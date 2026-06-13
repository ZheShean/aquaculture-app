import React, { useState, useEffect } from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, ReferenceArea, Tooltip } from 'recharts';
import { collection, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; // Adjust path if needed

export default function SensorMetrics() {
  const [latestData, setLatestData] = useState({ temperature: 0, pH: 0, EC: 0 });
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const mainCollectionRef = collection(db, 'main');

    // 1. Dynamic 24-Hour Query: Calculate exactly 24 hours ago
    const getPast24HoursString = () => {
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const pad = (n) => n.toString().padStart(2, '0');
      return `${yesterday.getFullYear()}-${pad(yesterday.getMonth() + 1)}-${pad(yesterday.getDate())}T${pad(yesterday.getHours())}:${pad(yesterday.getMinutes())}:${pad(yesterday.getSeconds())}`;
    };

    // Grab everything from the last 24 hours, regardless of how many documents that is
    const q = query(
      mainCollectionRef, 
      where('timestamp', '>=', getPast24HoursString()), 
      orderBy('timestamp', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setLatestData(snapshot.docs[0].data());

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

        // Put in chronological order (left to right)
        const chronologicalRecords = records.reverse();
        const processedRecords = [];

        // 2. GAP DETECTION LOGIC (1 Hour 30 Mins = 90 mins)
        const GAP_THRESHOLD_MS = 90 * 60 * 1000;

        for (let i = 0; i < chronologicalRecords.length; i++) {
          processedRecords.push(chronologicalRecords[i]);
          
          // Check the gap between this point and the NEXT point
          if (i < chronologicalRecords.length - 1) {
            const currentMs = new Date(chronologicalRecords[i].rawTimestamp).getTime();
            const nextMs = new Date(chronologicalRecords[i + 1].rawTimestamp).getTime();
            
            if (nextMs - currentMs > GAP_THRESHOLD_MS) {
              // Inject a 'null' point to break the Recharts line
              processedRecords.push({
                time: '', // Blank time label for the gap
                temperature: null,
                pH: null,
                EC: null
              });
            }
          }
        }

        // Check if the hardware is CURRENTLY offline (last log is > 90 mins old)
        const lastRecord = chronologicalRecords[chronologicalRecords.length - 1];
        if (lastRecord && lastRecord.rawTimestamp) {
          const lastLogTimeMs = new Date(lastRecord.rawTimestamp).getTime();
          if (Date.now() - lastLogTimeMs > GAP_THRESHOLD_MS) {
            processedRecords.push({
              time: 'Offline',
              temperature: null,
              pH: null,
              EC: null
            });
          }
        }

        setChartData(processedRecords);
      }
    }, (error) => {
      console.error("Firebase Error:", error.message);
    });

    return () => unsubscribe();
  }, []);

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

  // --- NEW: Custom Tooltip Component ---
  const CustomTooltip = ({ active, payload, unit, labelName }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      
      // Don't show tooltip on the blank gap spaces or offline label
      if (data.time === 'Offline' || data.time === '') return null;

      // Extract Date and Time from "2026-05-17T15:30:40"
      let dateStr = "";
      let timeStr = "";
      if (data.rawTimestamp) {
        const parts = data.rawTimestamp.split('T');
        dateStr = parts[0];
        timeStr = parts[1];
      }

      return (
        <div className="bg-white p-3 border border-slate-200 shadow-md rounded-xl text-sm z-50">
          <p className="text-slate-500 mb-1">Date: <span className="font-semibold text-slate-700">{dateStr}</span></p>
          <p className="text-slate-500 mb-2">Time: <span className="font-semibold text-slate-700">{timeStr}</span></p>
          <p className="font-bold text-slate-800">
            {labelName}: {payload[0].value} {unit}
          </p>
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
          <span className="text-medium font-bold text-slate-900 mt-1">Temperature</span>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-800">{latestData.temperature}</span>
            <span className="text-slate-500 text-sm">°C</span>
          </div>
          <span className={`${tempStatus.bg} ${tempStatus.color} text-sm px-4 py-1.5 rounded-lg font-bold`}>
            {tempStatus.text}
          </span>
        </div>

        <div className="w-full h-28 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              
              {/* EXACT TICKS: Boundaries (20, 40) and Danger Limits (25, 32) */}
              <YAxis domain={[20, 40]} ticks={[20, 25, 32, 40]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              
              <ReferenceArea y1={40} y2={32} fill="#fee2e2" fillOpacity={0.6} />
              <ReferenceArea y1={25} y2={20} fill="#fee2e2" fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip unit="°C" labelName="Temperature" />} />
              <Area type="monotone" dataKey="temperature" stroke="#f97316" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 2. pH LEVEL CARD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <img src="/ph-icon.png" alt="pH Icon" className="w-14 h-14 object-contain" />
          <span className="text-medium font-bold text-slate-900 mt-1">pH Level</span>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <span className="text-4xl font-bold text-slate-800">{latestData.pH}</span>
          <span className={`${phStatus.bg} ${phStatus.color} text-sm px-4 py-1.5 rounded-lg font-bold`}>
            {phStatus.text}
          </span>
        </div>

        <div className="w-full h-28 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              
              {/* EXACT TICKS: Boundaries (5, 10) and Danger Limits (6.5, 8.5) */}
              <YAxis domain={[5, 10]} ticks={[5, 6.5, 8.5, 10]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              
              <ReferenceArea y1={10} y2={8.5} fill="#fee2e2" fillOpacity={0.6} />
              <ReferenceArea y1={6.5} y2={5} fill="#fee2e2" fillOpacity={0.6} />
              <Tooltip content={<CustomTooltip unit="pH" labelName="pH Level" />} />
              <Area type="monotone" dataKey="pH" stroke="#a855f7" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 3. SALINITY LEVEL CARD */}
      <div className="bg-white rounded-[3rem] p-8 shadow-sm relative overflow-hidden h-[400px] flex flex-col justify-between">
        <div className="flex justify-between items-start w-full">
          <img src="/salinity-icon.png" alt="Salinity Icon" className="w-14 h-14 object-contain" />
          <span className="text-medium font-bold text-slate-900 mt-1">Salinity Level</span>
        </div>

        <div className="flex items-center gap-4 w-full px-2 my-1">
          <div className="flex items-baseline gap-1">
            <span className="text-4xl font-bold text-slate-800">{latestData.EC}</span>
            <span className="text-slate-500 text-xs">mS/cm</span>
          </div>
          <span className={`${ecStatus.bg} ${ecStatus.color} text-sm px-4 py-1.5 rounded-lg font-bold`}>
            {ecStatus.text}
          </span>
        </div>

        <div className="w-full h-40 mt-2 min-h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
              <XAxis dataKey="time" minTickGap={40} tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} />
              
              {/* EXACT TICKS: Boundaries (0, 2.5) and Danger Limits (0.25, 1.25) */}
              <YAxis domain={[0, 2.5]} ticks={[0, 0.25, 1.25, 2.5]} tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }} tickLine={false} />
              
              <ReferenceArea y1={2.5} y2={1.5} fill="#fee2e2" fillOpacity={0.6} />
              {/* <ReferenceArea y1={0.25} y2={0} fill="#fee2e2" fillOpacity={0.6} /> */}
              <Tooltip content={<CustomTooltip unit="mS/cm" labelName="Salinity Level" />} />
              <Area type="monotone" dataKey="EC" stroke="#06b6d4" strokeWidth={2} fill="none" connectNulls={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

    </div>
  );
}