import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase'; 
import AIassistant from './AIassistant';

// We grab the AI directly from the browser window
const tf = window.tf;
const tflite = window.tflite;

export default function AIWaterQuality() {
  const [model, setModel] = useState(null);
  
  // 2. Added state to capture raw values for the Gemini prompt
  const [rawValues, setRawValues] = useState({ temp: 0, ph: 0, ec: 0 });
  
  const [waterGrade, setWaterGrade] = useState({ 
    text: "Loading AI Model...", 
    color: "text-slate-500",
    bg: "bg-slate-50"
  });

  // --- EXACT SCALING VALUES ---
  const TEMP_MEAN = 27.4365; const TEMP_STD = 5.1919;
  const PH_MEAN = 7.5560;   const PH_STD = 1.5423;
  const EC_MEAN = 655.7557;   const EC_STD = 1024.7694;

  // 1. Load the AI Model
  useEffect(() => {
    const loadModel = async () => {
      try {
        // Tell TensorFlow where to find its web engine files
        tflite.setWasmPath('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-tflite@0.0.1-alpha.9/dist/');
        
        const loadedModel = await tflite.loadTFLiteModel('/health_prediction_model.tflite');
        setModel(loadedModel);
        setWaterGrade({ text: "Waiting for sensor data...", color: "text-slate-500", bg: "bg-slate-50" });
      } catch (error) {
        console.error("Error loading TFLite model:", error);
        setWaterGrade({ text: "Failed to load AI.", color: "text-red-500", bg: "bg-red-50" });
      }
    };
    loadModel();
  }, []);

  // 2. Listen to Firestore & Predict
  useEffect(() => {
    if (!model) return;

    const q = query(collection(db, "main"), orderBy("__name__", "desc"), limit(1));

    const unsub = onSnapshot(q, (querySnapshot) => {
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        const data = latestDoc.data();
        
        // ... inside your onSnapshot listener ...

  if (data.temperature !== undefined && data.pH !== undefined && data.EC !== undefined) {
  
    // 1. Extract raw values (Firestore holds EC in mS/cm)
    const tempVal = Number(data.temperature);
    const phVal = Number(data.pH);
    const ecValInMS = Number(data.EC); // Already in mS/cm from your hardware

    // 2. Prepare the values for the AI Model
    // The AI needs uS/cm! Multiply by 1000 so the math matches your training data.
    const tempScaled = (tempVal - TEMP_MEAN) / TEMP_STD;
    const phScaled = (phVal - PH_MEAN) / PH_STD;
    const ecInMicroSiemens = ecValInMS * 1000; 
    const ecScaled = (ecInMicroSiemens - EC_MEAN) / EC_STD;

    // --- AI PREDICTION LOGIC ---
    const inputTensor = tf.tensor2d([[tempScaled, phScaled, ecScaled]]);
    const outputTensor = model.predict(inputTensor);
  
    const predictionClassTensor = outputTensor.argMax(1);
    const predictionClass = predictionClassTensor.dataSync()[0];

    const statusMap = {
      0: { text: "Caution : Slightly degradation", color: "text-yellow-700", bg: "bg-yellow-50" },
      1: { text: "Normal : Optimal water quality condition", color: "text-emerald-700", bg: "bg-emerald-50" },
      2: { text: "Severe : High degradation", color: "text-red-700", bg: "bg-red-50" },
      3: { text: "Warning : Moderate degradation", color: "text-orange-700", bg: "bg-orange-50" }
    };
  
    setWaterGrade(statusMap[predictionClass] || { text: "Unknown State", color: "text-slate-500", bg: "bg-slate-50" });
  
    // Clean up browser memory
    inputTensor.dispose();
    outputTensor.dispose();
    predictionClassTensor.dispose(); 
  
    // 3. Prepare the values for the Dashboard Display / Gemini Prompt
    // Since Firestore already gave us mS/cm, pass it directly to the UI without dividing!
    setRawValues({ 
        temp: tempVal, 
        ph: phVal, 
        ec: ecValInMS 
    });
  }
      }
    });

    return () => unsub();
  }, [model]);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm min-h-[120px] flex flex-col justify-center">
      <h2 className="text-slate-500 font-medium text-sm mb-3">Current Water Quality Grade</h2>
      
      {/* 3. FLEX CONTAINER to align the grade and button horizontally */}
      <div className="flex items-center justify-between gap-4">
        
        {/* Your original styled block is now flexible (flex-1) so it takes up the available space */}
        <div className={`flex-1 px-4 py-3 rounded-lg border border-opacity-50 font-semibold text-base ${waterGrade.bg} ${waterGrade.color} border-current`}>
          {waterGrade.text}
        </div>

        {/* The Gemini Button Component */}
        <AIassistant 
          temp={rawValues.temp} 
          ph={rawValues.ph} 
          ec={rawValues.ec} 
        />
        
      </div>
    </div>
  );
}