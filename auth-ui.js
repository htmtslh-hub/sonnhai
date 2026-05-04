// auth-ui.js — Modal đăng nhập OTP Gmail + navbar auth state
// Import vào mọi trang HTML dưới dạng <script type="module" src="/auth-ui.js">

import {
  auth,
  loginWithGoogle,
  loginWithOTP,
  logout,
  onAuthStateChanged,
} from './firebase.js';

// ─── INJECT MODAL HTML ────────────────────────────────────────────────────────

const modalHTML = `
<div id="auth-overlay" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
  <div id="auth-modal" style="background:#0D1018;border:1px solid #1C2232;border-radius:16px;padding:36px 32px;width:100%;max-width:400px;margin:16px;position:relative;box-shadow:0 0 60px rgba(0,212,212,.08);">
    <button id="auth-close" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8B93A8;font-size:20px;cursor:pointer;line-height:1;">✕</button>

    <!-- Step 1: Email -->
    <div id="auth-step-email">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;margin-bottom:8px;">🔐</div>
        <div style="font-family:'Exo 2',sans-serif;font-size:18px;font-weight:800;color:#DDE1EC;">Đăng nhập / Đăng ký</div>
        <div style="font-size:12px;color:#555F75;margin-top:4px;">Nhập Gmail để nhận mã xác thực</div>
      </div>
      <form id="auth-email-form" autocomplete="on">
        <div style="margin-bottom:16px;">
          <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Email Gmail</label>
          <input name="email" type="email" placeholder="your@gmail.com" required
            style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div id="auth-email-error" style="display:none;color:#EF4444;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px;"></div>
        <button type="submit" id="auth-send-otp-btn"
          style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
          Gửi mã xác thực
        </button>
      </form>

      <!-- Divider -->
      <div style="display:flex;align-items:center;gap:10px;margin:18px 0;">
        <div style="flex:1;height:1px;background:#1C2232;"></div>
        <span style="font-size:12px;color:#555F75;">hoặc</span>
        <div style="flex:1;height:1px;background:#1C2232;"></div>
      </div>

      <!-- Google Button -->
      <button id="auth-google-btn"
        style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px;font-family:inherit;font-size:14px;font-weight:600;color:#DDE1EC;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:border-color .2s;">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Tiếp tục với Google
      </button>
    </div>

    <!-- Step 2: OTP -->
    <div id="auth-step-otp" style="display:none;">
      <button id="auth-back-btn" style="background:none;border:none;color:#8B93A8;font-size:13px;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:4px;">
        ← Quay lại
      </button>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:28px;margin-bottom:8px;">📧</div>
        <div style="font-family:'Exo 2',sans-serif;font-size:18px;font-weight:800;color:#DDE1EC;">Kiểm tra email</div>
        <div style="font-size:12px;color:#555F75;margin-top:4px;">Mã xác thực đã gửi đến</div>
        <div id="auth-otp-email-display" style="font-size:13px;color:#00D4D4;font-weight:600;margin-top:4px;"></div>
      </div>
      <form id="auth-otp-form">
        <div style="display:flex;gap:8px;justify-content:center;margin-bottom:16px;" id="otp-inputs">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
          <input class="otp-digit" type="text" maxlength="1" inputmode="numeric" pattern="[0-9]" style="width:44px;height:52px;background:#12161F;border:1.5px solid #1C2232;border-radius:10px;text-align:center;font-size:22px;font-weight:800;color:#00D4D4;font-family:'Exo 2',monospace;outline:none;transition:border-color .2s;" onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div id="auth-otp-error" style="display:none;color:#EF4444;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px;"></div>
        <button type="submit" id="auth-verify-btn"
          style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
          Xác thực
        </button>
      </form>
      <div style="text-align:center;margin-top:14px;">
        <button id="auth-resend-btn" style="background:none;border:none;color:#555F75;font-size:12px;cursor:pointer;font-family:inherit;" disabled>
          Gửi lại mã (<span id="auth-resend-timer">120</span>s)
        </button>
      </div>
    </div>

  </div>
</div>
`;

// ─── INJECT STYLES ────────────────────────────────────────────────────────────

const styleEl = document.createElement('style');
styleEl.textContent = `
  #auth-overlay { display: none !important; }
  #auth-overlay.open { display: flex !important; }
  #auth-google-btn:hover { border-color: #00D4D4 !important; }
  #auth-send-otp-btn:hover, #auth-verify-btn:hover { background: #00EEEE !important; box-shadow: 0 0 22px rgba(0,212,212,.25); }
  .otp-digit:focus { border-color: #00D4D4 !important; box-shadow: 0 0 0 3px rgba(0,212,212,.12); }

  /* Navbar auth button injected styles */
  .nav-auth-btn {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--teal, #00D4D4); color: var(--bg, #08090E);
    border: none; border-radius: 7px; padding: 7px 18px;
    font-family: inherit; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: all .22s; text-decoration: none;
  }
  .nav-auth-btn:hover { background: #00EEEE; box-shadow: 0 0 22px rgba(0,212,212,.25); transform: translateY(-1px); }
  .nav-user-menu {
    position: relative; display: inline-flex; align-items: center; gap: 8px;
    cursor: pointer;
  }
  .nav-user-avatar {
    width: 30px; height: 30px; border-radius: 50%;
    background: var(--teal, #00D4D4); color: var(--bg, #08090E);
    display: flex; align-items: center; justify-content: center;
    font-size: 13px; font-weight: 700; overflow: hidden;
    border: 2px solid rgba(0,212,212,.3);
  }
  .nav-user-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .nav-user-name { font-size: 13px; font-weight: 600; color: var(--text, #DDE1EC); max-width: 120px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .nav-user-dropdown {
    position: absolute; top: calc(100% + 10px); right: 0;
    background: #0D1018; border: 1px solid #1C2232; border-radius: 10px;
    padding: 6px; min-width: 180px; z-index: 300;
    box-shadow: 0 8px 32px rgba(0,0,0,.5);
    display: none;
  }
  .nav-user-menu:hover .nav-user-dropdown,
  .nav-user-menu:focus-within .nav-user-dropdown { display: block; }
  .nav-user-dropdown a, .nav-user-dropdown button {
    display: block; width: 100%; text-align: left; padding: 8px 12px;
    color: #DDE1EC; font-size: 13px; font-weight: 500;
    text-decoration: none; background: none; border: none;
    border-radius: 6px; cursor: pointer; font-family: inherit;
    transition: background .15s;
  }
  .nav-user-dropdown a:hover, .nav-user-dropdown button:hover { background: rgba(255,255,255,.05); }
  .nav-user-dropdown .dropdown-divider { height: 1px; background: #1C2232; margin: 4px 0; }
  .nav-user-dropdown .dropdown-logout { color: #EF4444 !important; }
`;
document.head.appendChild(styleEl);

// ─── INJECT MODAL ─────────────────────────────────────────────────────────────

document.body.insertAdjacentHTML('beforeend', modalHTML);

const overlay = document.getElementById('auth-overlay');
const stepEmail = document.getElementById('auth-step-email');
const stepOtp = document.getElementById('auth-step-otp');
const emailForm = document.getElementById('auth-email-form');
const otpForm = document.getElementById('auth-otp-form');
const emailError = document.getElementById('auth-email-error');
const otpError = document.getElementById('auth-otp-error');
const otpDigits = document.querySelectorAll('.otp-digit');

let pendingEmail = '';
let resendTimer = null;

// ─── MODAL CONTROL ────────────────────────────────────────────────────────────

export function openAuthModal() {
  overlay.classList.add('open');
  resetToEmailStep();
}

export function closeAuthModal() {
  overlay.classList.remove('open');
  resetToEmailStep();
}

function resetToEmailStep() {
  stepEmail.style.display = 'block';
  stepOtp.style.display = 'none';
  emailError.style.display = 'none';
  otpError.style.display = 'none';
  emailForm.reset();
  otpDigits.forEach(d => { d.value = ''; });
  clearInterval(resendTimer);
  pendingEmail = '';
}

document.getElementById('auth-close').addEventListener('click', closeAuthModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(); });
document.getElementById('auth-back-btn').addEventListener('click', resetToEmailStep);

// ─── OTP INPUT LOGIC ──────────────────────────────────────────────────────────

otpDigits.forEach((input, i) => {
  input.addEventListener('input', (e) => {
    const val = e.target.value.replace(/\D/g, '');
    e.target.value = val.slice(-1);
    if (val && i < otpDigits.length - 1) otpDigits[i + 1].focus();
  });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Backspace' && !e.target.value && i > 0) {
      otpDigits[i - 1].focus();
    }
  });
  // Paste support
  input.addEventListener('paste', (e) => {
    e.preventDefault();
    const paste = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6);
    paste.split('').forEach((ch, idx) => {
      if (otpDigits[idx]) otpDigits[idx].value = ch;
    });
    if (paste.length > 0) otpDigits[Math.min(paste.length, 5)].focus();
  });
});

// ─── SEND OTP ─────────────────────────────────────────────────────────────────

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  emailError.style.display = 'none';
  const btn = document.getElementById('auth-send-otp-btn');
  const email = emailForm.email.value.trim().toLowerCase();

  if (!email.endsWith('@gmail.com')) {
    emailError.textContent = 'Chỉ hỗ trợ đăng nhập bằng Gmail (@gmail.com)';
    emailError.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.style.opacity = '.6';
  btn.textContent = 'Đang gửi mã...';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Không thể gửi mã');

    pendingEmail = email;
    showOtpStep();
  } catch (err) {
    emailError.textContent = err.message;
    emailError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'Gửi mã xác thực';
  }
});

function showOtpStep() {
  stepEmail.style.display = 'none';
  stepOtp.style.display = 'block';
  document.getElementById('auth-otp-email-display').textContent = pendingEmail;
  otpDigits.forEach(d => { d.value = ''; });
  otpDigits[0].focus();
  startResendTimer();
}

function startResendTimer() {
  let seconds = 120;
  const timerEl = document.getElementById('auth-resend-timer');
  const resendBtn = document.getElementById('auth-resend-btn');
  resendBtn.disabled = true;
  resendBtn.style.color = '#555F75';
  timerEl.textContent = seconds;

  clearInterval(resendTimer);
  resendTimer = setInterval(() => {
    seconds--;
    timerEl.textContent = seconds;
    if (seconds <= 0) {
      clearInterval(resendTimer);
      resendBtn.disabled = false;
      resendBtn.style.color = '#00D4D4';
      resendBtn.innerHTML = 'Gửi lại mã';
    }
  }, 1000);
}

// ─── RESEND OTP ───────────────────────────────────────────────────────────────

document.getElementById('auth-resend-btn').addEventListener('click', async () => {
  if (!pendingEmail) return;
  const resendBtn = document.getElementById('auth-resend-btn');
  resendBtn.disabled = true;
  resendBtn.textContent = 'Đang gửi...';

  try {
    const res = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error);
    startResendTimer();
  } catch (err) {
    otpError.textContent = err.message;
    otpError.style.display = 'block';
    resendBtn.disabled = false;
    resendBtn.style.color = '#00D4D4';
    resendBtn.innerHTML = 'Gửi lại mã';
  }
});

// ─── VERIFY OTP ───────────────────────────────────────────────────────────────

otpForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  otpError.style.display = 'none';
  const code = Array.from(otpDigits).map(d => d.value).join('');
  const btn = document.getElementById('auth-verify-btn');

  if (code.length !== 6) {
    otpError.textContent = 'Vui lòng nhập đủ 6 chữ số';
    otpError.style.display = 'block';
    return;
  }

  btn.disabled = true;
  btn.style.opacity = '.6';
  btn.textContent = 'Đang xác thực...';

  try {
    const res = await fetch('/api/auth/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: pendingEmail, code }),
    });
    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Xác thực thất bại');

    // Sign in with Firebase custom token
    await loginWithOTP(data.data.customToken);
    closeAuthModal();
  } catch (err) {
    otpError.textContent = err.message;
    otpError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'Xác thực';
  }
});

// ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────

document.getElementById('auth-google-btn').addEventListener('click', async () => {
  const btn = document.getElementById('auth-google-btn');
  btn.disabled = true;
  btn.textContent = 'Đang kết nối...';
  try {
    await loginWithGoogle();
    closeAuthModal();
  } catch (err) {
    emailError.textContent = err.code === 'auth/popup-closed-by-user' ? 'Đã đóng cửa sổ đăng nhập.' : 'Đăng nhập Google thất bại.';
    emailError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Tiếp tục với Google`;
  }
});

// ─── NAVBAR AUTH STATE ────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

function renderNavAuth(user) {
  const navRight = document.querySelector('.nav-right');
  if (!navRight) return;

  const existing = navRight.querySelector('.nav-auth-btn, .nav-user-menu');
  if (existing) existing.remove();

  if (!user) {
    const btn = document.createElement('button');
    btn.className = 'nav-auth-btn';
    btn.textContent = 'Đăng nhập';
    btn.addEventListener('click', () => openAuthModal());
    navRight.appendChild(btn);
  } else {
    const menu = document.createElement('div');
    menu.className = 'nav-user-menu';
    menu.tabIndex = 0;

    const avatar = document.createElement('div');
    avatar.className = 'nav-user-avatar';
    if (user.photoURL) {
      avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || ''}">`;
    } else {
      avatar.textContent = getInitials(user.displayName || user.email);
    }

    const nameEl = document.createElement('span');
    nameEl.className = 'nav-user-name';
    nameEl.textContent = user.displayName || user.email;

    const dropdown = document.createElement('div');
    dropdown.className = 'nav-user-dropdown';
    const isAdmin = window.__fbUserRole === 'admin';
    dropdown.innerHTML = `
      <a href="/account.html">Tài khoản của tôi</a>
      <a href="/account.html#orders">Đơn hàng</a>
      <a href="/account.html#downloads">File đã mua</a>
      ${isAdmin ? '<a href="/admin.html">Quản trị</a>' : ''}
      <div class="dropdown-divider"></div>
      <button class="dropdown-logout" id="nav-logout-btn">Đăng xuất</button>
    `;

    menu.appendChild(avatar);
    menu.appendChild(nameEl);
    menu.appendChild(dropdown);
    navRight.appendChild(menu);

    dropdown.querySelector('#nav-logout-btn').addEventListener('click', async () => {
      await logout();
    });
  }
}

// Lắng nghe trạng thái auth và cập nhật navbar
onAuthStateChanged(auth, async (user) => {
  if (user) {
    try {
      const token = await user.getIdToken();
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        window.__fbUserRole = data.data?.user?.role;
      }
    } catch (_) {}
  } else {
    window.__fbUserRole = null;
  }
  renderNavAuth(user);
});

// Expose openAuthModal globally để các trang cũ (onclick="...") vẫn dùng được
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
