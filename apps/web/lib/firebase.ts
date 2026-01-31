import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyBAGvDwg6_F7gewrgkt_Lcm5f6IX-Merw8",
    authDomain: "yukti-c05b4.firebaseapp.com",
    projectId: "yukti-c05b4",
    storageBucket: "yukti-c05b4.firebasestorage.app",
    messagingSenderId: "378642395357",
    appId: "1:378642395357:web:f947da4b6bcb2948036b34",
    measurementId: "G-QPSCH39JME"
};

// Initialize Firebase (Singleton pattern)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

export { app, auth };
