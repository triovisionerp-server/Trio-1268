// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDA5LO1585YsSfL55Jb1SXehXs5rPsl7FY",
  authDomain: "composite-erp-system-162c0.firebaseapp.com",
  databaseURL: "https://composite-erp-system-162c0-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "composite-erp-system-162c0",
  storageBucket: "composite-erp-system-162c0.firebasestorage.app",
  messagingSenderId: "701532946165",
  appId: "1:701532946165:web:ce1f3d09692e43610ccfbc",
  measurementId: "G-ZY8SC4BJS7"
};

// Initialize app only once
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// Force long polling - fixes offline/timeout issues
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
});

export const auth = getAuth(app);