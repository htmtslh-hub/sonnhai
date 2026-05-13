// auth-ui.js — Modal đăng nhập Google + Email/Password + navbar auth state
// Import vào mọi trang HTML dưới dạng <script type="module" src="/auth-ui.js">

import {
  auth,
  loginWithGoogle,
  loginWithEmail,
  registerWithEmail,
  resetPassword,
  logout,
  getUserRole,
  onAuthStateChanged,
} from './firebase.js';

// ─── INJECT MODAL HTML ────────────────────────────────────────────────────────

const modalHTML = `
<div id="auth-overlay" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
  <div id="auth-modal" style="background:#0D1018;border:1px solid #1C2232;border-radius:16px;padding:36px 32px;width:100%;max-width:400px;margin:16px;position:relative;box-shadow:0 0 60px rgba(0,212,212,.08);">
    <button id="auth-close" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8B93A8;font-size:20px;cursor:pointer;line-height:1;">✕</button>

    <!-- Main Auth View -->
    <div id="auth-main-view">
      <div style="text-align:center;margin-bottom:24px;">
        <div style="font-size:28px;margin-bottom:8px;"></div>
        <div style="font-family:'Exo 2',sans-serif;font-size:18px;font-weight:800;color:#DDE1EC;">Đăng nhập / Đăng ký</div>
        <div style="font-size:12px;color:#555F75;margin-top:4px;">Chọn phương thức đăng nhập</div>
      </div>

      <!-- Google Button -->
      <button id="auth-google-btn"
        style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:12px;font-family:inherit;font-size:14px;font-weight:600;color:#DDE1EC;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .2s;margin-bottom:16px;">
        <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
        Tiếp tục với Google
      </button>

      <!-- Divider -->
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px;">
        <div style="flex:1;height:1px;background:#1C2232;"></div>
        <span style="font-size:12px;color:#555F75;">hoặc dùng email</span>
        <div style="flex:1;height:1px;background:#1C2232;"></div>
      </div>

      <!-- Email/Password Form -->
      <form id="auth-email-form" autocomplete="on">
        <div id="auth-name-group" style="margin-bottom:12px;display:none;">
          <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Họ và tên</label>
          <input name="name" type="text" placeholder="Nguyễn Văn A"
            style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Email</label>
          <input name="email" type="email" placeholder="email@example.com" required autocomplete="email"
            style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div style="margin-bottom:12px;">
          <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Mật khẩu</label>
          <input name="password" type="password" placeholder="Tối thiểu 6 ký tự" required autocomplete="current-password"
            style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div id="auth-error" style="display:none;color:#EF4444;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px;"></div>
        <button type="submit" id="auth-submit-btn"
          style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
          Đăng nhập
        </button>
      </form>

      <!-- Toggle register/login -->
      <div style="text-align:center;margin-top:14px;">
        <button id="auth-toggle-mode" style="background:none;border:none;color:#00D4D4;font-size:12.5px;cursor:pointer;font-family:inherit;">
          Chưa có tài khoản? <strong>Đăng ký</strong>
        </button>
      </div>
      <div style="text-align:center;margin-top:8px;">
        <button id="auth-forgot-btn" style="background:none;border:none;color:#555F75;font-size:11.5px;cursor:pointer;font-family:inherit;">
          Quên mật khẩu?
        </button>
      </div>

      <p style="font-size:11px;color:#555F75;text-align:center;line-height:1.6;margin-top:14px;">
        Bằng cách đăng nhập, bạn đồng ý với
        <a href="/support.html" style="color:#8B93A8;text-decoration:none;">Điều khoản</a> và
        <a href="/support.html" style="color:#8B93A8;text-decoration:none;">Chính sách bảo mật</a>.
      </p>
    </div>

    <!-- Forgot Password View -->
    <div id="auth-forgot-view" style="display:none;">
      <button id="auth-forgot-back" style="background:none;border:none;color:#8B93A8;font-size:13px;cursor:pointer;margin-bottom:16px;display:flex;align-items:center;gap:4px;">
         -  Quay lại
      </button>
      <div style="text-align:center;margin-bottom:20px;">
        <div style="font-size:28px;margin-bottom:8px;"></div>
        <div style="font-family:'Exo 2',sans-serif;font-size:18px;font-weight:800;color:#DDE1EC;">Quên mật khẩu</div>
        <div style="font-size:12px;color:#555F75;margin-top:4px;">Nhập email để nhận link đặt lại mật khẩu</div>
      </div>
      <form id="auth-forgot-form">
        <div style="margin-bottom:12px;">
          <input name="email" type="email" placeholder="email@example.com" required
            style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
            onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
        </div>
        <div id="auth-forgot-msg" style="display:none;font-size:12px;margin-bottom:12px;padding:8px 12px;border-radius:6px;"></div>
        <button type="submit" id="auth-forgot-submit"
          style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
          Gửi link đặt lại
        </button>
      </form>
    </div>

  </div>
</div>
`;

// ─── INJECT STYLES ────────────────────────────────────────────────────────────

const styleEl = document.createElement('style');
styleEl.textContent = `
  #auth-overlay { display: none !important; }
  #auth-overlay.open { display: flex !important; }
  #auth-google-btn:hover { border-color: #00D4D4 !important; background: #171C27 !important; }
  #auth-submit-btn:hover { background: #00EEEE !important; box-shadow: 0 0 22px rgba(0,212,212,.25); }
  #auth-forgot-submit:hover { background: #00EEEE !important; box-shadow: 0 0 22px rgba(0,212,212,.25); }
  #auth-toggle-mode:hover { text-decoration: underline; }
  #auth-forgot-btn:hover { color: #8B93A8 !important; }

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
const mainView = document.getElementById('auth-main-view');
const forgotView = document.getElementById('auth-forgot-view');
const emailForm = document.getElementById('auth-email-form');
const errorEl = document.getElementById('auth-error');
const nameGroup = document.getElementById('auth-name-group');
const submitBtn = document.getElementById('auth-submit-btn');
const toggleBtn = document.getElementById('auth-toggle-mode');

let isRegisterMode = false;

// ─── MODAL CONTROL ────────────────────────────────────────────────────────────

export function openAuthModal() {
  overlay.classList.add('open');
  resetModal();
}

export function closeAuthModal() {
  overlay.classList.remove('open');
  resetModal();
}

function resetModal() {
  mainView.style.display = 'block';
  forgotView.style.display = 'none';
  errorEl.style.display = 'none';
  emailForm.reset();
  setMode(false);
}

function setMode(register) {
  isRegisterMode = register;
  nameGroup.style.display = register ? 'block' : 'none';
  submitBtn.textContent = register ? 'Đăng ký' : 'Đăng nhập';
  toggleBtn.innerHTML = register
    ? 'Đã có tài khoản? <strong>Đăng nhập</strong>'
    : 'Chưa có tài khoản? <strong>Đăng ký</strong>';
  emailForm.password.placeholder = register ? 'Tối thiểu 6 ký tự' : 'Nhập mật khẩu';
  emailForm.password.autocomplete = register ? 'new-password' : 'current-password';
  errorEl.style.display = 'none';
}

function showError(msg) {
  errorEl.textContent = msg;
  errorEl.style.display = 'block';
}

document.getElementById('auth-close').addEventListener('click', closeAuthModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(); });
toggleBtn.addEventListener('click', () => setMode(!isRegisterMode));

// ─── GOOGLE LOGIN ─────────────────────────────────────────────────────────────

document.getElementById('auth-google-btn').addEventListener('click', async () => {
  const btn = document.getElementById('auth-google-btn');
  const origHTML = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10" stroke="#00D4D4" stroke-width="2.5" fill="none" stroke-dasharray="31 31"/></svg> Đang kết nối...`;
  try {
    await loginWithGoogle();
    closeAuthModal();
  } catch (err) {
    if (err.code === 'auth/popup-closed-by-user') {
      showError('Bạn đã đóng cửa sổ đăng nhập Google.');
    } else if (err.code === 'auth/cancelled-popup-request') {
      // ignore — user clicked again before popup finished
    } else {
      showError('Đăng nhập Google thất bại: ' + (err.message || err.code));
    }
  } finally {
    btn.disabled = false;
    btn.innerHTML = origHTML;
  }
});

// ─── EMAIL/PASSWORD LOGIN/REGISTER ────────────────────────────────────────────

emailForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.style.display = 'none';

  const email = emailForm.email.value.trim();
  const password = emailForm.password.value;
  const name = emailForm.name?.value?.trim() || '';

  if (!email) { showError('Vui lòng nhập email.'); return; }
  if (!password || password.length < 6) { showError('Mật khẩu phải có ít nhất 6 ký tự.'); return; }
  if (isRegisterMode && !name) { showError('Vui lòng nhập họ và tên.'); return; }

  submitBtn.disabled = true;
  submitBtn.style.opacity = '.6';
  submitBtn.textContent = isRegisterMode ? 'Đang đăng ký...' : 'Đang đăng nhập...';

  try {
    if (isRegisterMode) {
      await registerWithEmail(email, password, name);
    } else {
      await loginWithEmail(email, password);
    }
    closeAuthModal();
  } catch (err) {
    const messages = {
      'auth/email-already-in-use': 'Email này đã được đăng ký. Hãy đăng nhập.',
      'auth/invalid-email': 'Email không hợp lệ.',
      'auth/weak-password': 'Mật khẩu quá yếu, cần ít nhất 6 ký tự.',
      'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
      'auth/wrong-password': 'Mật khẩu không đúng.',
      'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
      'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau.',
    };
    showError(messages[err.code] || 'Đã xảy ra lỗi: ' + (err.message || err.code));
  } finally {
    submitBtn.disabled = false;
    submitBtn.style.opacity = '1';
    submitBtn.textContent = isRegisterMode ? 'Đăng ký' : 'Đăng nhập';
  }
});

// ─── FORGOT PASSWORD ──────────────────────────────────────────────────────────

document.getElementById('auth-forgot-btn').addEventListener('click', () => {
  mainView.style.display = 'none';
  forgotView.style.display = 'block';
});

document.getElementById('auth-forgot-back').addEventListener('click', () => {
  mainView.style.display = 'block';
  forgotView.style.display = 'none';
});

document.getElementById('auth-forgot-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const msgEl = document.getElementById('auth-forgot-msg');
  const btn = document.getElementById('auth-forgot-submit');
  const email = e.target.email.value.trim();

  if (!email) {
    msgEl.textContent = 'Vui lòng nhập email.';
    msgEl.style.display = 'block';
    msgEl.style.color = '#EF4444';
    msgEl.style.background = 'rgba(239,68,68,.08)';
    return;
  }

  btn.disabled = true;
  btn.textContent = 'Đang gửi...';

  try {
    await resetPassword(email);
    msgEl.textContent = '✓ Link đặt lại mật khẩu đã gửi đến ' + email + '. Kiểm tra hộp thư (và Spam).';
    msgEl.style.display = 'block';
    msgEl.style.color = '#10B981';
    msgEl.style.background = 'rgba(16,185,129,.08)';
  } catch (err) {
    const messages = {
      'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
      'auth/invalid-email': 'Email không hợp lệ.',
    };
    msgEl.textContent = messages[err.code] || 'Lỗi: ' + (err.message || err.code);
    msgEl.style.display = 'block';
    msgEl.style.color = '#EF4444';
    msgEl.style.background = 'rgba(239,68,68,.08)';
  } finally {
    btn.disabled = false;
    btn.textContent = 'Gửi link đặt lại';
  }
});

// ─── NAVBAR AUTH STATE ────────────────────────────────────────────────────────

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).filter(Boolean).slice(-2).join('').toUpperCase();
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
      avatar.innerHTML = `<img src="${user.photoURL}" alt="${user.displayName || ''}" referrerpolicy="no-referrer">`;
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
      window.__fbUserRole = await getUserRole(user.uid);
    } catch (_) {
      window.__fbUserRole = null;
    }
  } else {
    window.__fbUserRole = null;
  }
  renderNavAuth(user);
});

// Expose openAuthModal globally để các trang (onclick="...") vẫn dùng được
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

// Spinner animation
const spinStyle = document.createElement('style');
spinStyle.textContent = `@keyframes spin { to { transform: rotate(360deg); } }`;
document.head.appendChild(spinStyle);
