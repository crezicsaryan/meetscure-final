// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

// ⚠️ REPLACE THIS WITH YOUR FIREBASE CONFIG FROM STEP 1
const firebaseConfig = {
  apiKey: "AIzaSyCoBo95FK0R1C-kJSVHgZ_2i82Eqj2Czzw",
  authDomain: "meetscure.firebaseapp.com",
  projectId: "meetscure",
  storageBucket: "meetscure.firebasestorage.app",
  messagingSenderId: "51327835886",
  appId: "1:51327835886:web:12b981efc878bfef095dff",
  measurementId: "G-0BXRLZNZXJ"
};


const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const provider = new GoogleAuthProvider();