// Firestore Storage - Replaces GitHub-based storage
import { db } from './firebase-init.js';
import { getUserId, waitForAuth, setUserId as fbSetUserId } from './firebase-auth.js';
import { DEFAULT_USER_ID, isValidUserId, normalizeUserId } from './userid.js';
import { 
  doc, getDoc, setDoc, deleteDoc, collection, 
  query, where, getDocs, orderBy, writeBatch,
  Timestamp 
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// ========== DRIVES ==========

export async function getDrive(date) {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'drives', userId, 'daily', date);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveDrive(date, data) {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'drives', userId, 'daily', date);
  await setDoc(ref, {
    ...data,
    updatedAt: new Date().toISOString()
  });
  return true;
}

export async function deleteDrive(date) {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'drives', userId, 'daily', date);
  await deleteDoc(ref);
  return true;
}

export async function getDrivesForMonth(period) {
  await waitForAuth();
  const userId = getUserId();
  const [year, month] = period.split('-').map(Number);
  const startDate = `${period}-01`;
  const endDate = `${period}-${String(new Date(year, month, 0).getDate()).padStart(2, '0')}`;
  
  const q = query(
    collection(db, 'drives', userId, 'daily'),
    where('date', '>=', startDate),
    where('date', '<=', endDate),
    orderBy('date', 'asc')
  );
  
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// Get all drives (for review/analysis)
export async function getAllDrives() {
  await waitForAuth();
  const userId = getUserId();
  const q = query(
    collection(db, 'drives', userId, 'daily'),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.data());
}

// Get all drive dates (for navigation)
export async function getAllDriveDates() {
  await waitForAuth();
  const userId = getUserId();
  const q = query(
    collection(db, 'drives', userId, 'daily'),
    orderBy('date', 'asc')
  );
  const snap = await getDocs(q);
  return snap.docs.map(d => d.id); // document ID is the date
}

// ========== CONFIG ==========

export async function getConfig() {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'configs', userId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  return snap.data();
}

export async function saveConfig(config) {
  await waitForAuth();
  const userId = getUserId();
  const ref = doc(db, 'configs', userId);
  await setDoc(ref, {
    ...config,
    updatedAt: new Date().toISOString()
  });
  return true;
}

// ========== BATCH OPERATIONS (for data migration) ==========

export async function batchSaveDrives(drives) {
  await waitForAuth();
  const userId = getUserId();
  const batch = writeBatch(db);
  
  for (const drive of drives) {
    const ref = doc(db, 'drives', userId, 'daily', drive.date);
    batch.set(ref, drive);
  }
  
  await batch.commit();
  return true;
}

// ========== PENDING QUEUE (for offline support) ==========

const PENDING_KEY = 'taxi_pending_queue';

export function queuePending(date, data) {
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  queue.push({ date, data, timestamp: Date.now() });
  localStorage.setItem(PENDING_KEY, JSON.stringify(queue));
}

export async function flushPendingQueue() {
  const queue = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
  if (queue.length === 0) return;
  
  await waitForAuth();
  const batch = writeBatch(db);
  const userId = getUserId();
  const processed = [];
  
  for (const item of queue) {
    try {
      const ref = doc(db, 'drives', userId, 'daily', item.date);
      batch.set(ref, item.data);
      processed.push(item);
    } catch (e) {
      console.error('Failed to queue item:', e);
    }
  }
  
  await batch.commit();
  
  // Remove processed items
  const remaining = queue.filter(q => !processed.includes(q));
  localStorage.setItem(PENDING_KEY, JSON.stringify(remaining));
}

// ========== CACHE (same interface as before) ==========

export function getConfigCached() {
  const cached = localStorage.getItem('taxi_config_cache');
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 300000) return data; // 5 min cache
  } catch (e) {}
  return null;
}

export function cacheConfig(config) {
  localStorage.setItem('taxi_config_cache', JSON.stringify({
    data: config,
    timestamp: Date.now()
  }));
}

export function getDrivesForMonthCached(period) {
  const cached = localStorage.getItem(`taxi_drives_${period}`);
  if (!cached) return null;
  try {
    const { data, timestamp } = JSON.parse(cached);
    if (Date.now() - timestamp < 300000) return data;
  } catch (e) {}
  return null;
}

export function cacheDrivesForMonth(period, drives) {
  localStorage.setItem(`taxi_drives_${period}`, JSON.stringify({
    data: drives,
    timestamp: Date.now()
  }));
}

// ========== COMPATIBILITY EXPORTS (match storage-github.js interface) ==========

const USER_ID_KEY = 'taxi_user_id';

export function getMyUserId() {
  // Prefer Firebase auth userId, fallback to localStorage
  const fbUid = getUserId();
  if (fbUid) return fbUid;
  const raw = localStorage.getItem(USER_ID_KEY);
  if (!raw) return DEFAULT_USER_ID;
  const norm = normalizeUserId(raw);
  return isValidUserId(norm) ? norm : DEFAULT_USER_ID;
}

export function setMyUserId(id) {
  const norm = normalizeUserId(id);
  if (!isValidUserId(norm)) {
    throw new Error('userId は英小文字始まりで英小文字・数字・アンダースコアのみ使用可');
  }
  localStorage.setItem(USER_ID_KEY, norm);
  // Also update Firebase if possible
  try { fbSetUserId(norm); } catch (e) {}
  return norm;
}

export function getRepo() {
  return 'firebase://taxi-dailydata';
}
