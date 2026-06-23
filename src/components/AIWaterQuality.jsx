import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, doc, setDoc } from 'firebase/firestore'; // ADDED: doc, setDoc
import { db } from '../firebase'; 
import AIassistant from './AIassistant';

// We grab the AI directly from the browser window
const tf = window.tf;
const tflite = window.tflite;

export default function AIWaterQuality() {
  const [model, setModel] = useState(null);
  
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

  // 2. Listen to Firestore, Predict & Write Flag
  useEffect(() => {
    if (!model) return;

    // Use a robust order to ensure we strictly capture the absolute latest record entry
    const q = query(collection(db, "main"), orderBy("timestamp", "desc"), limit(1));

    const unsub = onSnapshot(q, async (querySnapshot) => { // ADDED: async for setDoc
      if (!querySnapshot.empty) {
        const latestDoc = querySnapshot.docs[0];
        const data = latestDoc.data();
        
        if (data.temperature !== undefined && data.pH !== undefined && data.EC !== undefined) {
          
          // 1. Extract raw values
          const tempVal = Number(data.temperature);
          const phVal = Number(data.pH);
          const ecValInMS = Number(data.EC); 

          // 2. Scale values for the TFLite Model (AI needs uS/cm)
          const tempScaled = (tempVal - TEMP_MEAN) / TEMP_STD;
          const phScaled = (phVal - PH_MEAN) / PH_STD;
          const ecInMicroSiemens = ecValInMS * 1000; 
          const ecScaled = (ecInMicroSiemens - EC_MEAN) / EC_STD;

          // --- AI PREDICTION LOGIC ---
          const inputTensor = tf.tensor2d([[tempScaled, phScaled, ecScaled]]);
          const outputTensor = model.predict(inputTensor);
        
          const predictionClassTensor = outputTensor.argMax(1);
          const predictionClass = predictionClassTensor.dataSync()[0];

          // UI Layout Status Map
          const statusMap = {
            0: { text: "Slightly Degradation: Monitor closely", color: "text-yellow-700", bg: "bg-yellow-50" },
            1: { text: "Optimal Condition: Everything is perfect", color: "text-emerald-700", bg: "bg-emerald-50" },
            2: { text: "Severe Degradation: Danger, immediate threat to fish life.", color: "text-red-700", bg: "bg-red-50" },
            3: { text: "Moderate Degradation: Condition is getting worse.", color: "text-orange-700", bg: "bg-orange-50" }
          };
        
          setWaterGrade(statusMap[predictionClass] || { text: "Unknown State", color: "text-slate-500", bg: "bg-slate-50" });
        
          // REFINED: Translating alphabetical ML classes into logical danger levels for the ESP32
          // ML Class 1 (Normal)  -> 0, ML Class 0 (Caution) -> 1, ML Class 3 (Warning) -> 2, ML Class 2 (Severe)  -> 3
          let flagValue = 0; // Default fallback to 0 (Normal)

          if (predictionClass === 1) {
            flagValue = 0; // Optimal water quality condition
          } else if (predictionClass === 0) {
            flagValue = 1; // Slightly degradation
          } else if (predictionClass === 3) {
            flagValue = 2; // Moderate degradation
          } else if (predictionClass === 2) {
            flagValue = 3; // High degradation
          }

          // NEW: Write/Overwrite the single indicator flag field inside Firestore
          try {
            const flagRef = doc(db, 'actuators', 'degrade_flag');
            await setDoc(flagRef, { isDegrade: flagValue }, { merge: true });
          } catch (writeError) {
            console.error("Error writing degradation state flag to Firestore:", writeError);
          }

          // Clean up WebGL/WASM browser hardware memory leaks
          inputTensor.dispose();
          outputTensor.dispose();
          predictionClassTensor.dispose(); 
        
          // 3. Keep dashboard state updated
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
    <div className="bg-white rounded-[3rem] p-8 shadow-sm min-h-[120px] flex flex-col justify-center">
      <h2 className="text-slate-900 font-bold text-medium mb-2">Current Fish Farm Water Quality</h2>
      
      <div className="flex items-center justify-between gap-4">
        <div className={`flex-1 px-4 py-3 rounded-2xl border border-opacity-50 font-bold text-base ${waterGrade.bg} ${waterGrade.color} border-current`}>
          {waterGrade.text}
        </div>

        <AIassistant 
          temp={rawValues.temp} 
          ph={rawValues.ph} 
          ec={rawValues.ec} 
        />
      </div>
    </div>
  );
}