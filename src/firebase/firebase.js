// src/firebase/firebase.js
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyDqauw33PRUziAO0NebfEecTLilOADu6p4",
  authDomain: "pin-noter.firebaseapp.com",
  databaseURL: "https://pin-noter-default-rtdb.firebaseio.com",
  projectId: "pin-noter",
  storageBucket: "pin-noter.firebasestorage.app",
  messagingSenderId: "824579372085",
  appId: "1:824579372085:web:aa7d7b39121127df46ed7c",
  measurementId: "G-MYTH9EG5E1"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const provider = new GoogleAuthProvider();
const auth = getAuth(app);
const database = getDatabase(app);
const db = getDatabase(app);

export { auth, database, analytics, provider,db };