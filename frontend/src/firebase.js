import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
    apiKey: "AIzaSyBgH8hpWJ97mqLFfoDDW9A_78pR5YjEmxo",
    authDomain: "jamba-wear.firebaseapp.com",
    projectId: "jamba-wear",
    storageBucket: "jamba-wear.firebasestorage.app",
};

// Initialize Firebase once
const app = initializeApp(firebaseConfig);

// Export the tools so ANY component can use them instantly
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);