import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

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

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);