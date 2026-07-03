import { initializeApp, FirebaseApp } from 'firebase/app';
import {
  getFirestore, Firestore, collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, updateDoc, query, where, orderBy, limit, Timestamp, onSnapshot, Unsubscribe, DocumentData, QueryConstraint, or, and, writeBatch, increment
} from 'firebase/firestore';
import {
  getAuth, Auth, signInWithEmailAndPassword, signInAnonymously, signOut as fbSignOut, createUserWithEmailAndPassword, updatePassword, sendEmailVerification, deleteUser as fbDeleteUser, User
} from 'firebase/auth';
import {
  getStorage, FirebaseStorage, ref, uploadBytes, getDownloadURL, deleteObject
} from 'firebase/storage';

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyAHy_UO71JugONQYffhrDCXL-uRA-UrEvI",
  authDomain: "cacambas-4ecdb.firebaseapp.com",
  projectId: "cacambas-4ecdb",
  storageBucket: "cacambas-4ecdb.firebasestorage.app",
  messagingSenderId: "823507759041",
  appId: "1:823507759041:web:1c5c708bcdac01e89c4940"
};

let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let storage: FirebaseStorage;

try {
  app = initializeApp(FIREBASE_CONFIG);
  db = getFirestore(app);
  auth = getAuth(app);
  storage = getStorage(app);
} catch (e) {
  console.error('[Firebase] Init error:', e);
}

export { db, auth, storage };
export {
  collection, doc, getDocs, getDoc, setDoc, addDoc, deleteDoc, updateDoc, query, where, orderBy, limit, Timestamp, onSnapshot, signInWithEmailAndPassword, signInAnonymously, fbSignOut, createUserWithEmailAndPassword, updatePassword, sendEmailVerification, fbDeleteUser, ref, uploadBytes, getDownloadURL, deleteObject, or, and, writeBatch, increment
};
export type { Firestore, Auth, Unsubscribe, DocumentData, User, FirebaseStorage };
