// firebase-admin.js — Firebase Admin SDK (chỉ dùng phía backend)
// Dùng để verify Firebase ID tokens từ frontend

const admin = require('firebase-admin');

if (!admin.apps.length) {
  // Khởi tạo với projectId — dùng Application Default Credentials hoặc service account
  // Trong môi trường dev không có service account, dùng projectId để verify token qua Google API
  admin.initializeApp({
    projectId: 'ban-sach-24d69',
  });
}

module.exports = admin;
