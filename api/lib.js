// ═══════════════════════════════════════════════════════════════════════════════
// API Utilities — Helpers dùng chung cho Vercel Serverless Functions
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Set CORS headers cho response
 */
function setCors(res, methods = 'GET, POST, OPTIONS') {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', methods);
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
}

/**
 * Response helper — success
 */
function success(res, data, status = 200) {
  return res.status(status).json({ success: true, data });
}

/**
 * Response helper — error
 */
function error(res, message, status = 400) {
  return res.status(status).json({ success: false, error: message });
}

module.exports = { setCors, success, error };
