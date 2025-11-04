import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDUlMxzYK3Rxfh86-MGCzGqdySAeDl8EBY",
  authDomain: "counselling-app-eca64.firebaseapp.com",
  projectId: "counselling-app-eca64",
  storageBucket: "counselling-app-eca64.firebasestorage.app",
  messagingSenderId: "638865252922",
  appId: "1:638865252922:web:42d26b708151edfce4cb03",
  measurementId: "G-3527TT0QQF"
};

// Initialize Firebase main app
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app);

// Initialize Cloud Firestore and get a reference to the service
export const db = getFirestore(app);

// Initialize Analytics (only in browser environment)
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;

// Secondary Firebase app instance for creating users without affecting main session
// This is used only for admin user creation operations
let secondaryApp: any = null;
export const getSecondaryAuth = () => {
  if (!secondaryApp) {
    // Create a secondary app instance with a unique name
    secondaryApp = initializeApp(firebaseConfig, 'secondary');
  }
  return getAuth(secondaryApp);
};

export default app;
