// ═══════════════════════════════════════════════════════════════════════════════
// Verify OTP API — Xác thực mã OTP và tạo Firebase Custom Token
// POST /api/auth/verify-otp
// ═══════════════════════════════════════════════════════════════════════════════

const { getAdminDb, getAdminApp, admin } = require('../firebase-admin');

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', 'https://sonnhai.vercel.app');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const { email, code } = req.body || {};

  // ─── Validate input ───
  if (!email || !code) {
    return res.status(400).json({ success: false, error: 'Vui lòng nhập email và mã xác thực' });
  }

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedCode = code.trim();

  if (!trimmedEmail.endsWith('@gmail.com')) {
    return res.status(400).json({ success: false, error: 'Chỉ hỗ trợ Gmail (@gmail.com)' });
  }

  if (!/^\d{6}$/.test(trimmedCode)) {
    return res.status(400).json({ success: false, error: 'Mã xác thực phải là 6 chữ số' });
  }

  try {
    const db = getAdminDb();

    // ─── Tìm OTP code hợp lệ (simple query, không cần composite index) ───
    const otpQuery = await db.collection('otp_codes')
      .where('email', '==', trimmedEmail)
      .where('code', '==', trimmedCode)
      .where('used', '==', false)
      .limit(5)
      .get();

    if (otpQuery.empty) {
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực không đúng hoặc đã được sử dụng',
      });
    }

    // Tìm OTP mới nhất phù hợp
    let validOtpDoc = null;
    for (const doc of otpQuery.docs) {
      const data = doc.data();
      let expiresAtMs;
      if (data.expiresAt && data.expiresAt.toDate) {
        expiresAtMs = data.expiresAt.toDate().getTime();
      } else if (data.expiresAt) {
        expiresAtMs = new Date(data.expiresAt).getTime();
      } else {
        continue;
      }
      // Còn hạn?
      if (Date.now() <= expiresAtMs) {
        validOtpDoc = doc;
        break;
      }
    }

    if (!validOtpDoc) {
      // Tất cả đã hết hạn → đánh dấu used
      for (const doc of otpQuery.docs) {
        await doc.ref.update({ used: true, status: 'expired' });
      }
      return res.status(400).json({
        success: false,
        error: 'Mã xác thực đã hết hạn. Vui lòng gửi mã mới.',
      });
    }

    // ─── Đánh dấu OTP đã sử dụng ───
    await validOtpDoc.ref.update({
      used: true,
      usedAt: admin.firestore.Timestamp.now(),
      status: 'verified',
    });

    // ─── Tìm hoặc tạo user trong Firebase Auth + Firestore ───
    let firebaseUser;
    const authAdmin = admin.auth(getAdminApp());

    try {
      firebaseUser = await authAdmin.getUserByEmail(trimmedEmail);
      console.log(`[OTP] Found existing user: ${firebaseUser.uid}`);
    } catch (authErr) {
      if (authErr.code === 'auth/user-not-found') {
        firebaseUser = await authAdmin.createUser({
          email: trimmedEmail,
          displayName: trimmedEmail.split('@')[0],
          emailVerified: true,
        });
        console.log(`[OTP] ✓ Created new Firebase Auth user: ${firebaseUser.uid}`);
      } else {
        throw authErr;
      }
    }

    // Tìm hoặc tạo Firestore user document
    const userRef = db.collection('users').doc(firebaseUser.uid);
    const userDoc = await userRef.get();

    let userData;
    if (!userDoc.exists) {
      userData = {
        email: trimmedEmail,
        name: firebaseUser.displayName || trimmedEmail.split('@')[0],
        role: 'customer',
        authMethod: 'otp',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await userRef.set(userData);
      console.log(`[OTP] ✓ Created Firestore user doc: ${firebaseUser.uid}`);
    } else {
      userData = userDoc.data();
      await userRef.update({
        lastLoginAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    // ─── Tạo Firebase Custom Token ───
    const customToken = await authAdmin.createCustomToken(firebaseUser.uid);

    console.log(`[OTP] ✓ Verified OTP for ${trimmedEmail} (uid: ${firebaseUser.uid})`);

    return res.status(200).json({
      success: true,
      data: {
        customToken,
        user: {
          uid: firebaseUser.uid,
          email: trimmedEmail,
          name: userData.name || firebaseUser.displayName || trimmedEmail.split('@')[0],
          role: userData.role || 'customer',
        },
      },
    });

  } catch (error) {
    console.error('[OTP] Verify error:', error.message, error.stack);
    return res.status(500).json({ success: false, error: 'Đã xảy ra lỗi: ' + error.message });
  }
};
