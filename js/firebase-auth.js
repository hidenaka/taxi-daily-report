// Firebase Auth - Anonymous authentication + user ID management
import { auth, db } from './firebase-init.js';
import { signInAnonymously, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

let currentUser = null;
let currentUserId = null;

// Initialize anonymous auth
export async function initAuth() {
  return new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
      if (user) {
        currentUser = user;
        // Load or create user profile
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          currentUserId = userDoc.data().userId;
        } else {
          // Generate a default userId
          currentUserId = generateUserId();
          await setDoc(doc(db, 'users', user.uid), {
            userId: currentUserId,
            createdAt: new Date().toISOString(),
            isAnonymous: true
          });
        }
        resolve(user);
      } else {
        // Not signed in, sign in anonymously
        try {
          const result = await signInAnonymously(auth);
          currentUser = result.user;
          currentUserId = generateUserId();
          await setDoc(doc(db, 'users', currentUser.uid), {
            userId: currentUserId,
            createdAt: new Date().toISOString(),
            isAnonymous: true
          });
          resolve(currentUser);
        } catch (e) {
          reject(e);
        }
      }
    });
  });
}

// Generate a random user ID (alphanumeric, starts with letter)
function generateUserId() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  result += chars.charAt(Math.floor(Math.random() * 26)); // first char is a letter
  for (let i = 0; i < 7; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Get current user ID
export function getUserId() {
  return currentUserId || localStorage.getItem('taxi_user_id');
}

// Set custom user ID (account switching)
export async function setUserId(newId) {
  if (!currentUser) throw new Error('Not authenticated');
  if (!/^[a-z][a-z0-9_]*$/.test(newId)) throw new Error('Invalid user ID format');
  
  currentUserId = newId;
  await setDoc(doc(db, 'users', currentUser.uid), {
    userId: newId,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  localStorage.setItem('taxi_user_id', newId);
  return true;
}

// Check if user is authenticated
export function isAuthenticated() {
  return !!currentUser;
}

// Get current user object
export function getCurrentUser() {
  return currentUser;
}

// Wait for auth to be ready
export async function waitForAuth() {
  if (currentUser) return currentUser;
  return initAuth();
}
