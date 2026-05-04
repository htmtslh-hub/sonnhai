// Firebase SDK (module) — dùng chung toàn bộ frontend
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  signInWithCustomToken,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-storage.js';

const firebaseConfig = {
  apiKey: "AIzaSyCctQ_86VvAlZPTQDQPyGeYjV9zMHLv_Sc",
  authDomain: "sonnhai-2600f.firebaseapp.com",
  projectId: "sonnhai-2600f",
  storageBucket: "sonnhai-2600f.firebasestorage.app",
  messagingSenderId: "907935883175",
  appId: "1:907935883175:web:0f356a63e28a45a196a082",
  measurementId: "G-JXP5V9W6GN",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// ─── API HELPER ───────────────────────────────────────────────────────────────
// Tự động đính kèm Firebase ID token vào mọi request tới backend Express

const API_BASE = 'http://localhost:3000/api';

export async function apiFetch(path, options = {}) {
  const user = auth.currentUser;
  const headers = { 'Content-Type': 'application/json', ...(options.headers || {}) };

  if (user) {
    const token = await user.getIdToken();
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json();

  if (!res.ok) {
    throw Object.assign(new Error(data.error || 'Lỗi server'), { status: res.status, data });
  }
  return data;
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await syncUserToBackend(cred.user);
  return cred.user;
}

export async function registerWithEmail(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name });
  await syncUserToBackend(cred.user, name);
  return cred.user;
}

export async function loginWithGoogle() {
  const cred = await signInWithPopup(auth, googleProvider);
  await syncUserToBackend(cred.user);
  return cred.user;
}

export async function loginWithOTP(customToken) {
  const cred = await signInWithCustomToken(auth, customToken);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

// Sau khi đăng nhập Firebase, đồng bộ user với backend SQLite
async function syncUserToBackend(firebaseUser, displayName) {
  try {
    const token = await firebaseUser.getIdToken();
    await fetch(`${API_BASE}/auth/firebase`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name: displayName || firebaseUser.displayName }),
    });
  } catch (e) {
    // Không block nếu backend sync thất bại
    console.warn('Backend sync failed:', e.message);
  }
}

// ─── AUTH STATE ───────────────────────────────────────────────────────────────
// Trả về Promise resolve với user hiện tại (hoặc null)

export function getCurrentUser() {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

export { onAuthStateChanged, updateProfile };
