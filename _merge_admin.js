const fs = require('fs');

// Read both files
const admin1 = fs.readFileSync('admin.html', 'utf8');
const admin2 = fs.readFileSync('admin-extended.html', 'utf8');

// Extract styles from admin.html (everything before </style>)
const styleEnd1 = admin1.indexOf('</style>');
const styles1 = admin1.substring(0, styleEnd1 + 8);

// Extract styles from admin-extended.html
const styleEnd2 = admin2.indexOf('</style>');
const styles2 = admin2.substring(admin2.indexOf('<style>'), styleEnd2 + 8);

// Merge styles - take admin1 as base and add unique styles from admin2
let mergedStyles = styles1;

// Add unique CSS classes from admin2 that aren't in admin1
const uniqueCssFromAdmin2 = [
  '.editor-group', '.editor-label', '.editor-input', 'textarea.editor-input',
  '.preview-box', '.preview-label', '.file-upload-area', '.file-upload-icon',
  '.file-upload-text', '.file-upload-hint', '.file-preview', '.file-preview-icon',
  '.file-preview-info', '.file-preview-name', '.file-preview-size', '.file-preview-remove',
  '.email-item', '.email-icon', '.email-content', '.email-to', '.email-subject',
  '.email-time', '.email-status', '.log-item', '.log-icon', '.log-content', '.log-text',
  '.grid-2'
];

// Check which unique styles are missing
for (const cls of uniqueCssFromAdmin2) {
  if (!mergedStyles.includes(cls.split(' ')[0])) {
    // Extract this rule from admin2 styles
    const startIdx = styles2.indexOf(cls);
    if (startIdx !== -1) {
      let endIdx = styles2.indexOf('}', startIdx) + 1;
      // Find the full rule block
      let depth = 0;
      let i = startIdx;
      while (i < styles2.length) {
        if (styles2[i] === '{') depth++;
        if (styles2[i] === '}') {
          depth--;
          if (depth === 0) {
            endIdx = i + 1;
            break;
          }
        }
        i++;
      }
      const rule = styles2.substring(startIdx, endIdx).trim();
      mergedStyles = mergedStyles.replace('</style>', '\n    ' + rule + '\n  </style>');
    }
  }
}

// Now build the unified HTML
let html = `<!DOCTYPE html>
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
`;

html += mergedStyles.replace('<style>', '').replace('</style>', '').trim();

// Add the grid-2 and editor styles
html += `
    .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
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
    .form-checkbox { display: flex; align-items: center; gap: 8px; cursor: pointer; font-size: 13px; color: var(--text-2); }
    .email-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .email-item:last-child { border-bottom: none; }
    .email-icon { font-size: 24px; }
    .email-content { flex: 1; }
    .email-to { font-size: 13px; font-weight: 600; }
    .email-subject { font-size: 12px; color: var(--text-2); margin-top: 2px; }
    .email-time { font-size: 11px; color: var(--text-3); }
    .log-item { display: flex; align-items: center; gap: 12px; padding: 14px 20px; border-bottom: 1px solid var(--border); }
    .log-item:last-child { border-bottom: none; }
    .log-icon { font-size: 20px; }
    .log-content { flex: 1; }
    .log-text { font-size: 13px; }
    .log-text strong { color: var(--teal); }
    .log-time { font-size: 11px; color: var(--text-3); }
  </style>
</head>
<body>
`;

// Extract login screen from admin.html
const loginStart = admin1.indexOf('<!--    LOGIN SCREEN    -->');
const loginEnd = admin1.indexOf('<!--    APP    -->');
const loginHtml = admin1.substring(loginStart, loginEnd);

// Extract app structure from admin.html (the shell)
const appStart = admin1.indexOf('<!--    APP    -->');
// We need to find where the sections end and script starts
const scriptStart = admin1.indexOf('<script>');

// Now we'll rebuild the sidebar with ALL sections
const unifiedSidebar = `
    <!--    SIDEBAR    -->
    <div class="sidebar" id="sidebar">
      <div class="sidebar-logo">
        <div class="sb-badge">SN</div>
        <div class="sb-title">SƠN <span>NHAI</span></div>
      </div>

      <div class="sidebar-nav">
        <div class="sb-section-label">HỆ THỐNG</div>
        <a class="sb-item active" onclick="switchPage('dashboard')"><span class="sb-icon">📊</span><span class="sb-text">Dashboard</span></a>
        <a class="sb-item" onclick="switchPage('products')"><span class="sb-icon">📚</span><span class="sb-text">Sản phẩm</span></a>
        <a class="sb-item" onclick="switchPage('orders')"><span class="sb-icon">🛒</span><span class="sb-text">Đơn hàng</span></a>
        <a class="sb-item" onclick="switchPage('customers')"><span class="sb-icon">👥</span><span class="sb-text">Khách hàng</span></a>
        <a class="sb-item" onclick="switchPage('payments')"><span class="sb-icon">💳</span><span class="sb-text">Thanh toán</span></a>

        <div class="sb-section-label">NỘI DUNG WEBSITE</div>
        <a class="sb-item" onclick="switchPage('home-hero')"><span class="sb-icon">🏠</span><span class="sb-text">Hero Section</span></a>
        <a class="sb-item" onclick="switchPage('home-features')"><span class="sb-icon">✨</span><span class="sb-text">Features</span></a>
        <a class="sb-item" onclick="switchPage('home-pricing')"><span class="sb-icon">💰</span><span class="sb-text">Pricing / Combo</span></a>
        <a class="sb-item" onclick="switchPage('product-editor')"><span class="sb-icon">✏️</span><span class="sb-text">Chỉnh sửa SP</span></a>

        <div class="sb-section-label">TRANG TĨNH</div>
        <a class="sb-item" onclick="switchPage('page-about')"><span class="sb-icon">ℹ️</span><span class="sb-text">Về chúng tôi</span></a>
        <a class="sb-item" onclick="switchPage('page-support')"><span class="sb-icon">❓</span><span class="sb-text">FAQ / Hỗ trợ</span></a>

        <div class="sb-section-label">LAYOUT</div>
        <a class="sb-item" onclick="switchPage('layout-menu')"><span class="sb-icon">🔗</span><span class="sb-text">Menu</span></a>
        <a class="sb-item" onclick="switchPage('layout-footer')"><span class="sb-icon">⬇️</span><span class="sb-text">Footer</span></a>
        <a class="sb-item" onclick="switchPage('layout-banner')"><span class="sb-icon">🎨</span><span class="sb-text">Banner</span></a>

        <div class="sb-section-label">KHÁC</div>
        <a class="sb-item" onclick="switchPage('testimonials')"><span class="sb-icon">💬</span><span class="sb-text">Testimonials</span></a>
        <a class="sb-item" onclick="switchPage('emails')"><span class="sb-icon">✉️</span><span class="sb-text">Email</span></a>
        <a class="sb-item" onclick="switchPage('seo')"><span class="sb-icon">🔍</span><span class="sb-text">SEO</span></a>
        <a class="sb-item" onclick="switchPage('settings')"><span class="sb-icon">⚙️</span><span class="sb-text">Cài đặt</span></a>
        <a class="sb-item" onclick="switchPage('logs')"><span class="sb-icon">📋</span><span class="sb-text">Nhật ký</span></a>
      </div>

      <div class="sb-toggle" onclick="toggleSidebar()"><span id="sb-toggle-icon">◀</span></div>
    </div>
`;

// Extract topbar from admin.html
const topbarStart = admin1.indexOf('<!--    TOPBAR    -->');
const topbarEnd = admin1.indexOf('<!--    CONTENT    -->');
const topbarHtml = admin1.substring(topbarStart, topbarEnd);

// Now let's find and extract all the page sections from admin.html
// The page sections are between <!--    CONTENT    --> and <script>
const contentArea = admin1.substring(admin1.indexOf('<!--    CONTENT    -->'), scriptStart);

// Extract the script from admin.html
const script1 = admin1.substring(scriptStart, admin1.lastIndexOf('</script>') + 9);

// Extract additional page sections from admin-extended.html
// Find sections between <!--    CONTENT    --> and <script>
const extScriptStart = admin2.indexOf('<script>');
const extContentArea = admin2.substring(admin2.indexOf('<!--    CONTENT    -->') > -1 ? admin2.indexOf('<!--    CONTENT    -->') : admin2.indexOf('<div class="content">'), extScriptStart > -1 ? extScriptStart : admin2.length);

// Extract extended script
const script2 = extScriptStart > -1 ? admin2.substring(extScriptStart, admin2.lastIndexOf('</script>') + 9) : '';

// Build the final HTML
let finalHtml = html;
finalHtml += loginHtml;
finalHtml += '\n  <!--    APP    -->\n  <div id="app" class="hidden">\n';
finalHtml += unifiedSidebar;
finalHtml += '\n    <!--    MAIN    -->\n    <div class="main">\n';
finalHtml += topbarHtml;

// Content area - we'll take from admin.html and add sections from admin-extended
finalHtml += '\n      <!--    CONTENT    -->\n      <div class="content">\n';

// Extract all page-section divs from admin1
const sections1 = extractSections(contentArea);
const sections2 = extractSections(extContentArea);

// Merge sections (avoid duplicates)
const existingIds = new Set();
const allSections = [...sections1, ...sections2].filter(s => {
  const idMatch = s.match(/id="(page-[^"]+)"/);
  if (idMatch && existingIds.has(idMatch[1])) return false;
  if (idMatch) existingIds.add(idMatch[1]);
  return true;
});

allSections.forEach(s => finalHtml += s + '\n');

// Close content and app
finalHtml += '\n      </div>\n    </div>\n  </div>\n';

// Modals from admin1
const modalStart = admin1.indexOf('<!--    MODAL    -->');
if (modalStart > -1) {
  const modalEnd = admin1.indexOf('<script>');
  finalHtml += admin1.substring(modalStart, modalEnd);
}

// Toast
finalHtml += '\n  <!--    TOAST    -->\n  <div id="toast" class="toast">\n    <span class="toast-icon" id="toast-icon">✓</span>\n    <span class="toast-text" id="toast-text">Thao tác thành công!</span>\n  </div>\n';

// Merge scripts
finalHtml += '\n  <script>\n';
finalHtml += mergeScripts(script1, script2);
finalHtml += '\n  </script>\n';
finalHtml += '</body>\n</html>\n';

fs.writeFileSync('admin.html', finalHtml);
console.log('✅ admin.html unified successfully!');
console.log('Sections:', allSections.length);

function extractSections(html) {
  const sections = [];
  const regex = /<div id="page-[^"]*" class="page-section[^"]*">([\s\S]*?<\/div>\s*<\/div>)/g;
  // Better approach: find page-section divs
  const pageRegex = /(<div id="page-[^"]*" class="page-section[^"]*">)/g;
  let match;

  while ((match = pageRegex.exec(html)) !== null) {
    const startIdx = match.index;
    const sectionHtml = findMatchingDiv(html, startIdx);
    if (sectionHtml) {
      sections.push(sectionHtml);
    }
  }
  return sections;
}

function findMatchingDiv(html, startIdx) {
  let depth = 0;
  let inDiv = false;
  for (let i = startIdx; i < html.length; i++) {
    if (html.substring(i, i + 4) === '<div') {
      depth++;
      inDiv = true;
    } else if (html.substring(i, i + 6) === '</div>') {
      depth--;
      if (inDiv && depth === 0) {
        return html.substring(startIdx, i + 6);
      }
    }
  }
  return null;
}

function mergeScripts(s1, s2) {
  // Take script1 as base, add unique functions from script2
  if (!s2) return s1;

  // Extract function names from s1
  const funcRegex = /function\s+(\w+)/g;
  let match;
  const existingFuncs = new Set();
  while ((match = funcRegex.exec(s1)) !== null) {
    existingFuncs.add(match[1]);
  }

  // Extract functions from s2 that don't exist in s1
  let added = '';
  const s2Funcs = s2.match(/function\s+\w+\s*\([^)]*\)\s*\{[\s\S]*?\n    \}/g) || [];

  for (const func of s2Funcs) {
    const nameMatch = func.match(/function\s+(\w+)/);
    if (nameMatch && !existingFuncs.has(nameMatch[1])) {
      added += '\n' + func + '\n';
      existingFuncs.add(nameMatch[1]);
    }
  }

  return s1.replace('<\/script>', added + '<\/script>');
}
