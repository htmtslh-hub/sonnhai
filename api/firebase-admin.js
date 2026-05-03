// ═══════════════════════════════════════════════════════════════════════════════
// Firebase Admin SDK — Dùng cho Vercel Serverless Functions
// ═══════════════════════════════════════════════════════════════════════════════

const admin = require('firebase-admin');

let adminApp;

function getAdminApp() {
  if (adminApp) return adminApp;

  // Khởi tạo từ FIREBASE_SERVICE_ACCOUNT env var (JSON string)
  // Hoặc fallback sang default credentials (cho local dev)
  if (!admin.apps.length) {
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;

    if (serviceAccount) {
      try {
        const parsed = JSON.parse(serviceAccount);
        adminApp = admin.initializeApp({
          credential: admin.credential.cert(parsed),
          projectId: parsed.project_id || 'sonnhai-2600f',
        });
      } catch (e) {
        console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT:', e.message);
        // Fallback: init với project ID only
        adminApp = admin.initializeApp({
          projectId: 'sonnhai-2600f',
        });
      }
    } else {
      // Local dev / no env var — init with project ID
      adminApp = admin.initializeApp({
        projectId: 'sonnhai-2600f',
      });
    }
  } else {
    adminApp = admin.apps[0];
  }

  return adminApp;
}

function getAdminDb() {
  const app = getAdminApp();
  return admin.firestore(app);
}

module.exports = { getAdminApp, getAdminDb, admin };
