import React from 'react';
import FishTank from './components/FishTank';
import SensorMetrics from './components/SensorMetrics';
import SystemStatus from './components/SystemStatus';
import FishActivity from './components/FishActivity';
import EventLog from './components/EventLog';
import AIWaterQuality from './components/AIWaterQuality';

export default function Dashboard() {
  return (
    // Main background: light gray so the white rectangles are visible
    <div className="min-h-screen bg-slate-100 p-4 flex flex-col gap-4 font-sans">
        
        {/* Top Header Placeholder */} 
        <FishTank />

        {/* Row 1: AI Machine Learning Prediction */}
        <AIWaterQuality />  

        {/* Row 2: 3 Columns for Temp, pH, Salinity */}
        <SensorMetrics />

        {/* Row 4: Event Log */}
        <EventLog />

        {/* Row 6: System Status */}
        <SystemStatus />

        {/* Row 7: Fish Activity */}
        <FishActivity />

    </div>
  );
}