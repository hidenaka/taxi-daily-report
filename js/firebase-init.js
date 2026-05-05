// Firebase initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyDwy688S23-aw9IoIe82FnHly8GZZJEaXw",
  authDomain: "taxi-dailydata.firebaseapp.com",
  projectId: "taxi-dailydata",
  storageBucket: "taxi-dailydata.firebasestorage.app",
  messagingSenderId: "797799790485",
  appId: "1:797799790485:web:6fb185c0ad7049feeae89c",
  measurementId: "G-83C6HHWD1L"
};

export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
