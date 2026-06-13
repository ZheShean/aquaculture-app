// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getAI, VertexAIBackend } from "firebase/ai";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD18KGODmFUtizxCQIZcEL3VcAdbIRhVPk",
  authDomain: "wms-fishsystem.firebaseapp.com",
  projectId: "wms-fishsystem",
  storageBucket: "wms-fishsystem.firebasestorage.app",
  messagingSenderId: "854636018543",
  appId: "1:854636018543:web:ee28edce5a1016d442869a",
  measurementId: "G-JNEPRX2M1H"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);
export const aiLogic = getAI(app, { backend: new VertexAIBackend('global') });



