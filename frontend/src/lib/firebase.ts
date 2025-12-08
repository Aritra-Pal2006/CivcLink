import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);



export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Emulator connection logic removed for Local Server architecture
// const useEmulator = import.meta.env.VITE_FIREBASE_EMULATOR === 'true' || location.hostname === "localhost";
// if (useEmulator) { ... }

// Messaging is only supported in secure contexts (HTTPS) or localhost
let messaging = null;
if (typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.protocol === "https:")) {
    try {
        messaging = getMessaging(app);
    } catch (e) {
        console.warn("Firebase Messaging failed to initialize", e);
    }
}
export { messaging };

export default app;
