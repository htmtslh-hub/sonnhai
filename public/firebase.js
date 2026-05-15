// Firebase SDK (module) — dùng chung toàn bộ frontend
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  orderBy,
  limit,
  arrayUnion,
  arrayRemove,
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

// ─── FIRESTORE USER SYNC ──────────────────────────────────────────────────────
// Đồng bộ user profile trực tiếp vào Firestore (client-side, không cần backend)

async function syncUserToFirestore(firebaseUser) {
  if (!firebaseUser) return;
  try {
    const userRef = doc(db, 'users', firebaseUser.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      // User mới — tạo document
      await setDoc(userRef, {
        email: firebaseUser.email,
        name: firebaseUser.displayName || firebaseUser.email.split('@')[0],
        photoURL: firebaseUser.photoURL || null,
        role: 'customer',
        authMethod: firebaseUser.providerData[0]?.providerId || 'unknown',
        createdAt: serverTimestamp(),
        lastLoginAt: serverTimestamp(),
      });
    } else {
      // User cũ — cập nhật lastLoginAt
      await updateDoc(userRef, {
        lastLoginAt: serverTimestamp(),
        // Cập nhật ảnh nếu có (Google có thể đổi ảnh)
        ...(firebaseUser.photoURL ? { photoURL: firebaseUser.photoURL } : {}),
      });
    }
  } catch (e) {
    console.warn('[Auth] Firestore sync failed (không ảnh hưởng đăng nhập):', e.message);
  }
}

// ─── AUTH HELPERS ─────────────────────────────────────────────────────────────

export async function loginWithEmail(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  await syncUserToFirestore(cred.user);
  return cred.user;
}

export async function registerWithEmail(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(cred.user, { displayName: name });
  }
  await syncUserToFirestore(cred.user);
  return cred.user;
}

// Phát hiện mobile browser
function isMobileBrowser() {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || (window.innerWidth <= 768);
}

export async function loginWithGoogle() {
  if (isMobileBrowser()) {
    // Mobile → dùng redirect (không bị chặn popup)
    await signInWithRedirect(auth, googleProvider);
    // Trang sẽ refresh, kết quả xử lý bởi handleRedirectResult() bên dưới
    return null;
  } else {
    // Desktop → dùng popup
    try {
      const cred = await signInWithPopup(auth, googleProvider);
      await syncUserToFirestore(cred.user);
      return cred.user;
    } catch (err) {
      // Nếu popup bị chặn trên desktop, fallback sang redirect
      if (err.code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider);
        return null;
      }
      throw err;
    }
  }
}

// Xử lý kết quả redirect khi trang load lại (sau Google Sign-in trên mobile)
async function handleRedirectResult() {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await syncUserToFirestore(result.user);
    }
  } catch (e) {
    console.warn('[Auth] Redirect result error:', e.message);
  }
}
// Gọi ngay khi module load
handleRedirectResult();

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

export async function logout() {
  await signOut(auth);
}

// ─── USER ROLE HELPER ─────────────────────────────────────────────────────────
// Lấy role từ Firestore (admin / customer)

export async function getUserRole(uid) {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return userDoc.data().role || 'customer';
    }
  } catch (e) {
    console.warn('[Auth] Cannot fetch user role:', e.message);
  }
  return 'customer';
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

export { onAuthStateChanged, updateProfile, doc, getDoc, updateDoc, setDoc, deleteDoc, serverTimestamp, collection, query, where, getDocs, addDoc, orderBy, limit, arrayUnion, arrayRemove };
