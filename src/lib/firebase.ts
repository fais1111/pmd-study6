// Import the functions you need from the SDKs you need
import { initializeApp, getApps, getApp } from "firebase/app";
import { 
    getAuth, 
    GoogleAuthProvider, 
    signInWithPopup, 
    UserCredential, 
    signInWithCredential,
    initializeAuth,
    getReactNativePersistence
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import "dotenv/config";
import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

let auth;
if (Capacitor.isNativePlatform()) {
    // Native platform
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage)
    });
    GoogleAuth.initialize({
      clientId: process.env.NEXT_PUBLIC_FIREBASE_WEB_CLIENT_ID,
      scopes: ['profile', 'email'],
      grantOfflineAccess: true,
    });
} else {
    // Web platform
    auth = getAuth(app); // uses browserLocalPersistence by default
}

const db = getFirestore(app);
const storage = getStorage(app);

const signInWithGoogle = async (): Promise<UserCredential | null> => {
    try {
        if (Capacitor.isNativePlatform()) {
            const googleUser = await GoogleAuth.signIn();
            const idToken = googleUser.authentication?.idToken;
            if (!idToken) {
                throw new Error("No ID token returned from Google Sign-In");
            }
            const credential = GoogleAuthProvider.credential(idToken);
            return await signInWithCredential(auth, credential);

        } else {
            const provider = new GoogleAuthProvider();
            provider.setCustomParameters({
                prompt: 'select_account'
            });
            return await signInWithPopup(auth, provider);
        }
    } catch (error: any) {
        // Handle cancellation gracefully
        if (error.message === 'SIGN_IN_CANCELLED' || error.code === 'auth/popup-closed-by-user' || error.message.includes('user closed the prompt')) {
            console.log("Sign-in process was cancelled by the user.");
            return null; // Return null to indicate cancellation
        }
        // Re-throw other errors
        throw error;
    }
};

export { app, auth, db, storage, signInWithGoogle };
