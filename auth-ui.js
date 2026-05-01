// auth-ui.js — Modal đăng nhập/đăng ký + navbar auth state
// Import vào mọi trang HTML dưới dạng <script type="module" src="/auth-ui.js">

import {
  auth,
  loginWithEmail,
  registerWithEmail,
  loginWithGoogle,
  logout,
  onAuthStateChanged,
} from './firebase.js';

// ─── INJECT MODAL HTML ────────────────────────────────────────────────────────

const modalHTML = `
<div id="auth-overlay" style="display:none;position:fixed;inset:0;z-index:9000;background:rgba(0,0,0,.7);backdrop-filter:blur(6px);align-items:center;justify-content:center;">
  <div id="auth-modal" style="background:#0D1018;border:1px solid #1C2232;border-radius:16px;padding:36px 32px;width:100%;max-width:400px;margin:16px;position:relative;box-shadow:0 0 60px rgba(0,212,212,.08);">
    <button id="auth-close" style="position:absolute;top:14px;right:16px;background:none;border:none;color:#8B93A8;font-size:20px;cursor:pointer;line-height:1;">✕</button>

    <!-- Tabs -->
    <div style="display:flex;gap:4px;background:#12161F;border-radius:8px;padding:4px;margin-bottom:28px;">
      <button class="auth-tab active" data-tab="login" style="flex:1;padding:8px;border:none;border-radius:6px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;">Đăng nhập</button>
      <button class="auth-tab" data-tab="register" style="flex:1;padding:8px;border:none;border-radius:6px;font-family:inherit;font-size:13px;font-weight:600;cursor:pointer;transition:all .2s;background:transparent;color:#8B93A8;">Đăng ký</button>
    </div>

    <!-- Login Form -->
    <form id="auth-login-form" autocomplete="on">
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Email</label>
        <input name="email" type="email" placeholder="your@email.com" required
          style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Mật khẩu</label>
        <input name="password" type="password" placeholder="••••••••" required
          style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
      </div>
      <div id="auth-login-error" style="display:none;color:#EF4444;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px;"></div>
      <button type="submit" id="auth-login-btn"
        style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
        Đăng nhập
      </button>
    </form>

    <!-- Register Form -->
    <form id="auth-register-form" style="display:none;" autocomplete="on">
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Họ tên</label>
        <input name="name" type="text" placeholder="Nguyễn Văn A" required
          style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
      </div>
      <div style="margin-bottom:14px;">
        <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Email</label>
        <input name="email" type="email" placeholder="your@email.com" required
          style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
      </div>
      <div style="margin-bottom:20px;">
        <label style="display:block;font-size:12px;color:#8B93A8;margin-bottom:6px;">Mật khẩu</label>
        <input name="password" type="password" placeholder="Ít nhất 6 ký tự" required minlength="6"
          style="width:100%;background:#12161F;border:1px solid #1C2232;border-radius:8px;padding:10px 14px;color:#DDE1EC;font-family:inherit;font-size:14px;outline:none;transition:border-color .2s;"
          onfocus="this.style.borderColor='#00D4D4'" onblur="this.style.borderColor='#1C2232'">
      </div>
      <div id="auth-register-error" style="display:none;color:#EF4444;font-size:12px;margin-bottom:12px;padding:8px 12px;background:rgba(239,68,68,.08);border-radius:6px;"></div>
      <button type="submit" id="auth-register-btn"
        style="width:100%;background:#00D4D4;color:#08090E;border:none;border-radius:8px;padding:11px;font-family:inherit;font-size:14px;font-weight:700;cursor:pointer;transition:all .2s;">
        Tạo tài khoản
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
</div>
`;

// ─── INJECT STYLES ────────────────────────────────────────────────────────────

const styleEl = document.createElement('style');
styleEl.textContent = `
  #auth-overlay { display: none !important; }
  #auth-overlay.open { display: flex !important; }
  .auth-tab { background: transparent; color: #8B93A8; }
  .auth-tab.active { background: #00D4D4 !important; color: #08090E !important; }
  #auth-google-btn:hover { border-color: #00D4D4 !important; }
  #auth-login-btn:hover, #auth-register-btn:hover { background: #00EEEE !important; box-shadow: 0 0 22px rgba(0,212,212,.25); }

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
const loginForm = document.getElementById('auth-login-form');
const registerForm = document.getElementById('auth-register-form');
const loginError = document.getElementById('auth-login-error');
const registerError = document.getElementById('auth-register-error');
const tabs = document.querySelectorAll('.auth-tab');

// ─── MODAL CONTROL ────────────────────────────────────────────────────────────

export function openAuthModal(tab = 'login') {
  overlay.classList.add('open');
  switchTab(tab);
}

export function closeAuthModal() {
  overlay.classList.remove('open');
  loginError.style.display = 'none';
  registerError.style.display = 'none';
  loginForm.reset();
  registerForm.reset();
}

function switchTab(tab) {
  tabs.forEach(t => t.classList.toggle('active', t.dataset.tab === tab));
  loginForm.style.display = tab === 'login' ? 'block' : 'none';
  registerForm.style.display = tab === 'register' ? 'block' : 'none';
}

document.getElementById('auth-close').addEventListener('click', closeAuthModal);
overlay.addEventListener('click', (e) => { if (e.target === overlay) closeAuthModal(); });
tabs.forEach(t => t.addEventListener('click', () => switchTab(t.dataset.tab)));

// ─── FORM HANDLERS ────────────────────────────────────────────────────────────

function setLoading(btn, loading) {
  btn.disabled = loading;
  btn.style.opacity = loading ? '.6' : '1';
  btn.textContent = loading
    ? 'Đang xử lý...'
    : btn.id === 'auth-login-btn' ? 'Đăng nhập' : 'Tạo tài khoản';
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.style.display = 'none';
  const btn = document.getElementById('auth-login-btn');
  const email = loginForm.email.value.trim();
  const password = loginForm.password.value;
  setLoading(btn, true);
  try {
    await loginWithEmail(email, password);
    closeAuthModal();
  } catch (err) {
    loginError.textContent = firebaseErrorMessage(err.code || err.message);
    loginError.style.display = 'block';
  } finally {
    setLoading(btn, false);
  }
});

registerForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  registerError.style.display = 'none';
  const btn = document.getElementById('auth-register-btn');
  const name = registerForm.name.value.trim();
  const email = registerForm.email.value.trim();
  const password = registerForm.password.value;
  setLoading(btn, true);
  try {
    await registerWithEmail(email, password, name);
    closeAuthModal();
  } catch (err) {
    registerError.textContent = firebaseErrorMessage(err.code || err.message);
    registerError.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.textContent = 'Tạo tài khoản';
  }
});

document.getElementById('auth-google-btn').addEventListener('click', async () => {
  const btn = document.getElementById('auth-google-btn');
  btn.disabled = true;
  btn.textContent = 'Đang kết nối...';
  try {
    await loginWithGoogle();
    closeAuthModal();
  } catch (err) {
    // Hiện lỗi ở form đang active
    const errEl = loginForm.style.display !== 'none' ? loginError : registerError;
    errEl.textContent = firebaseErrorMessage(err.code || err.message);
    errEl.style.display = 'block';
  } finally {
    btn.disabled = false;
    btn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg> Tiếp tục với Google`;
  }
});

// ─── FIREBASE ERROR MESSAGES ─────────────────────────────────────────────────

function firebaseErrorMessage(code) {
  const map = {
    'auth/invalid-email': 'Email không hợp lệ.',
    'auth/user-not-found': 'Không tìm thấy tài khoản với email này.',
    'auth/wrong-password': 'Mật khẩu không đúng.',
    'auth/invalid-credential': 'Email hoặc mật khẩu không đúng.',
    'auth/email-already-in-use': 'Email đã được sử dụng. Vui lòng đăng nhập.',
    'auth/weak-password': 'Mật khẩu quá yếu, cần ít nhất 6 ký tự.',
    'auth/popup-closed-by-user': 'Đã đóng cửa sổ đăng nhập.',
    'auth/network-request-failed': 'Lỗi kết nối mạng. Vui lòng thử lại.',
    'auth/too-many-requests': 'Quá nhiều lần thử. Vui lòng thử lại sau.',
  };
  return map[code] || 'Đã xảy ra lỗi, vui lòng thử lại.';
}

// ─── NAVBAR AUTH STATE ────────────────────────────────────────────────────────
// Tự động cập nhật khu vực right-nav trên mọi trang

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).slice(-2).join('').toUpperCase();
}

function renderNavAuth(user) {
  // Tìm container nav-right trên trang
  const navRight = document.querySelector('.nav-right');
  if (!navRight) return;

  // Xóa nút auth cũ (nếu có)
  const existing = navRight.querySelector('.nav-auth-btn, .nav-user-menu');
  if (existing) existing.remove();

  if (!user) {
    const btn = document.createElement('button');
    btn.className = 'nav-auth-btn';
    btn.textContent = 'Đăng nhập';
    btn.addEventListener('click', () => openAuthModal('login'));
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
    // Lấy role từ backend để hiện/ẩn link admin
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
