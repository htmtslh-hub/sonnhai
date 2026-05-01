const fs = require('fs');

// Read the two existing files
const admin1 = fs.readFileSync('admin.html', 'utf8');
const admin2 = fs.readFileSync('admin-extended.html', 'utf8');

// Extract components
// We'll build the unified admin from scratch with all features

const head = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SN Admin — Quản lý Toàn diện</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@400;500;600;700;800;900&family=Be+Vietnam+Pro:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"><\/script>
  <style>
    *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; }
    :root {
      --bg: #08090E; --bg-2: #0D1018; --bg-3: #12161F; --bg-4: #171C27;
      --border: #1C2232; --border-2: #252D3F;
      --teal: #00D4D4; --teal-dim: #00AEAE; --teal-dark: #005A5A;
      --teal-glow: rgba(0,212,212,0.12);
      --text: #DDE1EC; --text-2: #8B93A8; --text-3: #555F75;
      --warn: #F5A623; --red: #EF4444; --green: #10B981;
    }
    html { height: 100%; }
    body { font-family: 'Be Vietnam Pro', sans-serif; background: var(--bg); color: var(--text); height: 100%; overflow: hidden; }
    #login-screen { position: fixed; inset: 0; z-index: 1000; background: var(--bg); display: flex; align-items: center; justify-content: center; }
    #login-screen.hidden { display: none; }
    .login-card { width: 380px; background: var(--bg-2); border: 1px solid var(--border); border-radius: 18px; padding: 40px 36px; }
    .login-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
    .login-logo-badge { width: 40px; height: 40px; border-radius: 10px; background: var(--teal); display: flex; align-items: center; justify-content: center; font-family: 'Exo 2', sans-serif; font-weight: 900; font-size: 16px; color: var(--bg); }
    .login-logo-text { font-family: 'Exo 2', sans-serif; font-size: 15px; font-weight: 800; color: var(--text); letter-spacing: 1px; }
    .login-logo-text span { color: var(--teal); }
    .login-title { font-family: 'Exo 2', sans-serif; font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .login-sub { font-size: 13px; color: var(--text-3); margin-bottom: 28px; }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 12px; font-weight: 600; color: var(--text-2); margin-bottom: 7px; letter-spacing: 0.5px; text-transform: uppercase; }
    .form-input { width: 100%; padding: 10px 14px; background: var(--bg-3); border: 1px solid var(--border-2); border-radius: 8px; color: var(--text); font-family: 'Be Vietnam Pro', sans-serif; font-size: 14px; outline: none; transition: border-color .2s; }
    .form-input:focus { border-color: var(--teal); }
    .form-input::placeholder { color: var(--text-3); }
    textarea.form-input { resize: vertical; min-height: 90px; font-family: 'Be Vietnam Pro', sans-serif; }
    select.form-input { cursor: pointer; }
    .btn { display: inline-flex; align-items: center; justify-content: center; gap: 7px; border: none; border-radius: 8px; cursor: pointer; font-family: 'Be Vietnam Pro', sans-serif; font-weight: 600; transition: all .2s; font-size: 14px; }
    .btn-teal { background: var(--teal); color: var(--bg); padding: 11px 22px; }
    .btn-teal:hover { background: #00EEEE; box-shadow: 0 0 20px rgba(0,212,212,.3); }
    .btn-teal:disabled { opacity: .6; cursor: not-allowed; }
    .btn-full { width: 100%; }
    .btn-sm { font-size: 12px; padding: 6px 14px; border-radius: 6px; }
    .btn-outline-sm { background: transparent; border: 1px solid var(--border-2); color: var(--text-2); font-size: 12px; padding: 6px 14px; border-radius: 6px; }
    .btn-outline-sm:hover { border-color: var(--teal); color: var(--teal); }
    .btn-danger-sm { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); color: var(--red); font-size: 12px; padding: 6px 14px; border-radius: 6px; }
    .btn-danger-sm:hover { background: rgba(239,68,68,.2); }
    .btn-ghost-sm { background: transparent; border: 1px solid var(--border); color: var(--text-2); font-size: 12px; padding: 6px 12px; border-radius: 6px; }
    .btn-ghost-sm:hover { background: var(--bg-3); color: var(--text); }
    .login-error { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.3); border-radius: 8px; padding: 10px 14px; font-size: 13px; color: var(--red); margin-bottom: 16px; display: none; }
    #app { display: flex; height: 100vh; overflow: hidden; }
    #app.hidden { display: none; }
    .sidebar { width: 260px; min-width: 260px; background: #0A0B10; border-right: 1px solid var(--border); display: flex; flex-direction: column; transition: width .25s, min-width .25s; overflow-y: auto; }
    .sidebar.collapsed { width: 60px; min-width: 60px; }
    .sidebar-logo { display: flex; align-items: center; gap: 10px; padding: 18px 16px; border-bottom: 1px solid var(--border); min-height: 60px; }
    .sb-badge { width: 32px; height: 32px; border-radius: 8px; background: var(--teal); display: flex; align-items: center; justify-content: center; font-family: 'Exo 2', sans-serif; font-weight: 900; font-size: 13px; color: var(--bg); }
    .sb-title { font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 800; color: var(--text); letter-spacing: 1px; white-space: nowrap; transition: opacity .2s; }
    .sb-title span { color: var(--teal); }
    .sidebar.collapsed .sb-title { opacity: 0; pointer-events: none; }
    .sidebar-nav { flex: 1; padding: 10px 0; }
    .sb-section-label { font-size: 10px; font-weight: 700; letter-spacing: 1.2px; text-transform: uppercase; color: var(--text-3); padding: 12px 16px 6px; white-space: nowrap; transition: opacity .2s; }
    .sidebar.collapsed .sb-section-label { opacity: 0; }
    .sb-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; cursor: pointer; border-left: 2px solid transparent; transition: all .18s; white-space: nowrap; color: var(--text-2); font-size: 13px; font-weight: 500; }
    .sb-item:hover { background: var(--bg-3); color: var(--text); }
    .sb-item.active { background: rgba(0,212,212,.08); border-left-color: var(--teal); color: var(--teal); }
    .sb-icon { font-size: 16px; flex-shrink: 0; line-height: 1; }
    .sb-text { transition: opacity .2s; }
    .sidebar.collapsed .sb-text { opacity: 0; }
    .sb-toggle { padding: 14px 16px; border-top: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--text-3); transition: color .2s; font-size: 18px; }
    .sb-toggle:hover { color: var(--teal); }
    .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
    .topbar { height: 60px; background: var(--bg-2); border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 28px; gap: 16px; }
    .breadcrumb { flex: 1; display: flex; align-items: center; gap: 6px; font-size: 13px; }
    .breadcrumb-current { color: var(--text); font-weight: 600; }
    .topbar-right { display: flex; align-items: center; gap: 12px; }
    .admin-avatar { width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, var(--teal), var(--teal-dim)); display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 700; color: var(--bg); }
    .admin-name { font-size: 13px; font-weight: 600; color: var(--text); }
    .btn-logout { background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.25); color: var(--red); font-size: 12px; padding: 6px 14px; border-radius: 6px; cursor: pointer; font-family: 'Be Vietnam Pro', sans-serif; font-weight: 600; transition: all .18s; }
    .btn-logout:hover { background: rgba(239,68,68,.2); }
    .content { flex: 1; overflow-y: auto; padding: 28px; }
    .page-section { display: none; }
    .page-section.active { display: block; }
    .page-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 24px; }
    .page-title { font-family: 'Exo 2', sans-serif; font-size: 24px; font-weight: 700; }
    .page-sub { font-size: 13px; color: var(--text-3); margin-top: 4px; }
    .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
    .stat-card { background: var(--bg-2); border: 1px solid var(--border); border-radius: 12px; padding: 20px 24px; position: relative; overflow: hidden; transition: border-color .2s, box-shadow .2s; }
    .stat-card:hover { border-color: var(--border-2); box-shadow: 0 0 20px rgba(0,212,212,.06); }
    .stat-bg-icon { position: absolute; right: 16px; top: 50%; transform: translateY(-50%); font-size: 44px; opacity: .12; pointer-events: none; }
    .stat-label { font-size: 11px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--text-3); margin-bottom: 10px; }
    .stat-value { font-family: 'Exo 2', sans-serif; font-size: 28px; font-weight: 700; color: var(--teal); line-height: 1; }
    .stat-change { font-size: 11px; color: var(--text-3); margin-top: 6px; }
    .stat-change.up { color: var(--green); }
    .stat-change.down { color: var(--red); }
    .dash-grid { display: grid; grid-template-columns: 2fr 1fr; gap: 20px; margin-bottom: 20px; }
    .card-block { background: var(--bg-2); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; margin-bottom: 20px; }
    .card-block-header { display: flex; align-items: center; justify-content: space-between; padding: 16px 20px; border-bottom: 1px solid var(--border); }
    .card-block-title { font-size: 14px; font-weight: 700; color: var(--text); }
    .card-block-body { padding: 20px; }
    .card-block-body.no-pad { padding: 0; }
    .chart-container { position: relative; height: 300px; }
    .tbl-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    thead th { background: var(--bg-3); padding: 12px 16px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--text-3); text-align: left; white-space: nowrap; }
    tbody tr { border-bottom: 1px solid var(--border); transition: background .15s; }
    tbody tr:last-child { border-bottom: none; }
    tbody tr:hover { background: rgba(0,212,212,.03); }
    tbody td { padding: 12px 16px; font-size: 13px; color: var(--text); vertical-align: middle; }
    .badge { display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 700; }
    .badge-success, .badge-paid, .badge-published, .badge-active, .badge-completed { background: rgba(16,185,129,.15); color: #10B981; }
    .badge-pending, .badge-processing { background: rgba(245,166,35,.15); color: #F5A623; }
    .badge-failed, .badge-cancelled, .badge-inactive { background: rgba(239,68,68,.12); color: #EF4444; }
    .badge-draft, .badge-refunded { background: rgba(139,147,168,.15); color: #8B93A8; }
    .toolbar { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; flex-wrap: wrap; }
    .toolbar-search { flex: 1; min-width: 200px; max-width: 320px; display: flex; align-items: center; gap: 8px; background: var(--bg-3); border: 1px solid var(--border-2); border-radius: 8px; padding: 9px 14px; }
    .toolbar-search input { background: none; border: none; outline: none; color: var(--text); font-family: 'Be Vietnam Pro', sans-serif; font-size: 13px; width: 100%; }
    .toolbar-search input::placeholder { color: var(--text-3); }
    .toolbar-search-icon { font-size: 14px; color: var(--text-3); }
    .filter-select { background: var(--bg-3); border: 1px solid var(--border-2); color: var(--text-2); font-family: 'Be Vietnam Pro', sans-serif; font-size: 13px; padding: 9px 12px; border-radius: 8px; outline: none; cursor: pointer; }
    .filter-select:focus { border-color: var(--teal); }
    .prod-icon { width: 40px; height: 40px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px; background: var(--bg-3); }
    .pagination { display: flex; align-items: center; justify-content: center; gap: 6px; padding: 16px 0; }
    .page-btn { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: var(--bg-3); color: var(--text-2); cursor: pointer; font-size: 13px; font-family: 'Be Vietnam Pro', sans-serif; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .page-btn:hover { border-color: var(--teal); color: var(--teal); }
    .page-btn.active { background: var(--teal); color: var(--bg); border-color: var(--teal); font-weight: 700; }
    .page-btn:disabled { opacity: .4; cursor: not-allowed; }
    .modal-overlay { position: fixed; inset: 0; z-index: 500; background: rgba(0,0,0,.75); backdrop-filter: blur(6px); display: flex; align-items: center; justify-content: center; padding: 20px; }
    .modal-overlay.hidden { display: none; }
    .modal-box { background: var(--bg-2); border: 1px solid var(--border-2); border-radius: 16px; width: 100%; max-width: 600px; max-height: 90vh; display: flex; flex-direction: column; animation: modalIn .22s ease; }
    .modal-box.modal-lg { max-width: 800px; }
    .modal-box.modal-xl { max-width: 1000px; }
    @keyframes modalIn { from { transform: scale(.96) translateY(12px); opacity: 0; } to { transform: none; opacity: 1; } }
    .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid var(--border); }
    .modal-title { font-family: 'Exo 2', sans-serif; font-size: 17px; font-weight: 700; }
    .modal-close { width: 32px; height: 32px; border-radius: 8px; border: 1px solid var(--border); background: none; color: var(--text-3); cursor: pointer; font-size: 18px; display: flex; align-items: center; justify-content: center; transition: all .15s; }
    .modal-close:hover { border-color: var(--teal); color: var(--teal); }
    .modal-body { padding: 24px; overflow-y: auto; flex: 1; }
    .modal-footer { display: flex; align-items: center; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border); }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .form-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--text-2); }
    .form-checkbox input { width: 16px; height: 16px; cursor: pointer; }
    .toast { position: fixed; bottom: 24px; right: 24px; z-index: 600; background: var(--bg-2); border: 1px solid var(--border-2); border-radius: 10px; padding: 14px 18px; min-width: 280px; box-shadow: 0 8px 32px rgba(0,0,0,.4); display: flex; align-items: center; gap: 12px; transform: translateY(100px); opacity: 0; transition: all .3s ease; }
    .toast.show { transform: translateY(0); opacity: 1; }
    .toast-icon { font-size: 20px; }
    .toast-icon.success { color: var(--green); }
    .toast-icon.error { color: var(--red); }
    .toast-icon.info { color: var(--teal); }
    .toast-text { font-size: 13px; color: var(--text); }
    .activity-item { display: flex; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .activity-item:last-child { border-bottom: none; }
    .activity-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .activity-icon.icon-add { background: rgba(16,185,129,.15); color: #10B981; }
    .activity-icon.icon-edit { background: rgba(0,212,212,.15); color: var(--teal); }
    .activity-icon.icon-delete { background: rgba(239,68,68,.12); color: #EF4444; }
    .activity-icon.icon-order { background: rgba(245,166,35,.15); color: #F5A623; }
    .activity-content { flex: 1; }
    .activity-text { font-size: 13px; margin-bottom: 4px; }
    .activity-text strong { color: var(--teal); font-weight: 600; }
    .activity-time { font-size: 11px; color: var(--text-3); }
    .top-prod-item { display: flex; align-items: center; gap: 12px; padding: 12px 20px; border-bottom: 1px solid var(--border); }
    .top-prod-item:last-child { border-bottom: none; }
    .top-prod-rank { font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 700; color: var(--text-3); width: 22px; text-align: center; }
    .top-prod-name { flex: 1; font-size: 13px; font-weight: 500; }
    .top-prod-sold { font-size: 12px; color: var(--text-3); margin-right: 10px; }
    .top-prod-price { font-family: 'Exo 2', sans-serif; font-size: 13px; font-weight: 700; color: var(--teal); }
    .editor-group { margin-bottom: 20px; }
    .editor-label { font-size: 12px; font-weight: 700; color: var(--text-2); margin-bottom: 8px; letter-spacing: 0.5px; text-transform: uppercase; }
    .editor-input { width: 100%; padding: 12px 14px; background: var(--bg-3); border: 1px solid var(--border-2); border-radius: 8px; color: var(--text); font-family: 'Be Vietnam Pro', sans-serif; font-size: 14px; outline: none; transition: border-color .2s; }
    .editor-input:focus { border-color: var(--teal); }
    textarea.editor-input { min-height: 120px; resize: vertical; font-family: 'Be Vietnam Pro', sans-serif; }
    .preview-box { background: var(--bg-3); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-top: 12px; }
    .preview-label { font-size: 11px; font-weight: 700; color: var(--text-3); margin-bottom: 12px; letter-spacing: 1px; }
    .file-upload-area { border: 2px dashed var(--border-2); border-radius: 10px; padding: 32px 20px; text-align: center; cursor: pointer; transition: all .2s; background: var(--bg-3); }
    .file-upload-area:hover { border-color: var(--teal); }
    .file-upload-icon { font-size: 36px; color: var(--text-3); margin-bottom: 12px; }
    .file-upload-text { font-size: 13px; color: var(--text-2); margin-bottom: 4px; }
    .file-upload-hint { font-size: 11px; color: var(--text-3); }
    .file-preview { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-3); border-radius: 8px; margin-top: 12px; }
    .file-preview-icon { font-size: 24px; color: var(--teal); }
    .file-preview-info { flex: 1; }
    .file-preview-name { font-size: 13px; font-weight: 500; }
    .file-preview-size { font-size: 11px; color: var(--text-3); margin-top: 2px; }
    .file-preview-remove { width: 28px; height: 28px; border-radius: 6px; background: rgba(239,68,68,.1); border: 1px solid rgba(239,68,68,.2); color: var(--red); cursor: pointer; display: flex; align-items: center; justify-content: center; }
    @media (max-width: 1200px) { .stats-grid { grid-template-columns: repeat(2, 1fr); } .dash-grid { grid-template-columns: 1fr; } }
    @media (max-width: 768px) { .sidebar { width: 60px; min-width: 60px; } .sidebar .sb-text, .sidebar .sb-section-label { opacity: 0; } .stats-grid { grid-template-columns: 1fr; } .form-row { grid-template-columns: 1fr; } }
  </style>
</head>
<body>
`;

fs.writeFileSync('admin-unified.html', head);
console.log('Part 1 done: head + styles');
