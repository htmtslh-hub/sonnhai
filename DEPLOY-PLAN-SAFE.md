# Kế Hoạch Deploy An Toàn - Thư viện Sơn Nhai
**Ngày:** 01/05/2026
**Mục tiêu:** Deploy full-stack lên Firebase với zero downtime và rollback plan

---

## 🎯 NGUYÊN TẮC DEPLOY

1. **Test trước, deploy sau** - Không bao giờ deploy code chưa test
2. **Incremental deployment** - Deploy từng phần, không deploy all-in-one
3. **Always have rollback** - Luôn có kế hoạch quay lại
4. **Monitor everything** - Theo dõi mọi thứ sau deploy
5. **Document everything** - Ghi chép mọi bước

---

## 📋 PHASE 0: PRE-DEPLOYMENT CHECKLIST

### ✅ Code Quality
- [x] Không còn localhost URLs
- [x] Tất cả files UTF-8 encoding
- [x] Backup đã tạo
- [ ] Code review hoàn tất
- [ ] No console.log/debugger trong production code
- [ ] Error handling đầy đủ

### ✅ Environment
- [ ] Firebase project đã tạo
- [ ] Firebase CLI đã cài (v13+)
- [ ] Node.js 22.5+ đã cài
- [ ] Git repository clean (no uncommitted changes)

### ✅ Dependencies
- [ ] Backend dependencies đã install
- [ ] No security vulnerabilities (`npm audit`)
- [ ] All tests pass (nếu có)

### ✅ Configuration
- [ ] `.env` files đã chuẩn bị
- [ ] Firebase config đã có
- [ ] API keys đã sẵn sàng (Stripe, VNPay, MoMo)
- [ ] SMTP credentials đã có

---

## 🏗️ PHASE 1: SETUP FIREBASE (45 phút)

### Step 1.1: Install Firebase CLI
```bash
npm install -g firebase-tools@latest
firebase --version  # Verify >= 13.0.0
firebase login
```

**Verify:** Đăng nhập thành công, thấy email của bạn

### Step 1.2: Initialize Firebase Project
```bash
cd "d:\1. Tài nguyên\4. Code web\Test"
firebase init
```

**Chọn:**
- ✅ Firestore
- ✅ Functions
- ✅ Hosting
- ✅ Emulators

**Cấu hình:**
- Firestore rules: `firestore.rules`
- Firestore indexes: `firestore.indexes.json`
- Functions language: JavaScript
- Functions source: `functions`
- Public directory: `public`
- Single-page app: No
- GitHub deploys: No (có thể setup sau)

### Step 1.3: Verify Firebase Config
```bash
# Check files created
ls -la firebase.json .firebaserc

# Verify project ID
firebase projects:list
```

**Expected output:**
- `firebase.json` exists
- `.firebaserc` exists with correct project ID

---

## 📦 PHASE 2: PREPARE FRONTEND (30 phút)

### Step 2.1: Create Prepare Script

Tạo `prepare-public.js`:
```javascript
const fs = require('fs');
const path = require('path');

console.log('🚀 Preparing frontend for deployment...\n');

// Create public directory
if (!fs.existsSync('public')) {
  fs.mkdirSync('public');
  console.log('✓ Created public/ directory');
}

// HTML files to copy
const htmlFiles = [
  'index.html',
  'admin.html',
  'product.html',
  'categories.html',
  'cart.html',
  'checkout.html',
  'thank-you.html',
  'account.html',
  'blog.html',
  'blog-post.html',
  'about.html',
  'support.html',
  'seapay-return.html'
];

// Copy HTML files
let htmlCount = 0;
htmlFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
    htmlCount++;
  }
});
console.log(`✓ Copied ${htmlCount} HTML files`);

// Copy directories
const dirs = ['css', 'js'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('public', dir), { recursive: true });
    console.log(`✓ Copied ${dir}/ directory`);
  }
});

// Copy individual JS files
const jsFiles = ['firebase.js', 'auth-ui.js', 'parallax.js'];
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
  }
});
console.log(`✓ Copied ${jsFiles.length} JS files`);

// Copy images
const images = fs.readdirSync('.').filter(f => 
  /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(f)
);
images.forEach(img => {
  fs.copyFileSync(img, path.join('public', img));
});
console.log(`✓ Copied ${images.length} images`);

// Create .gitignore in public
fs.writeFileSync('public/.gitignore', '# Ignore everything\n*\n');

console.log('\n✅ Frontend preparation complete!');
console.log(`📁 Total files in public/: ${fs.readdirSync('public').length}`);
```

### Step 2.2: Create Root package.json
```json
{
  "name": "thu-vien-son-nhai",
  "version": "1.0.0",
  "description": "Website bán sách số - Thư viện Sơn Nhai",
  "scripts": {
    "prepare-public": "node prepare-public.js",
    "clean": "rm -rf public functions/node_modules",
    "deploy": "npm run prepare-public && firebase deploy",
    "deploy:hosting": "npm run prepare-public && firebase deploy --only hosting",
    "deploy:functions": "firebase deploy --only functions",
    "deploy:firestore": "firebase deploy --only firestore:rules",
    "emulator": "firebase emulators:start",
    "test:local": "npm run prepare-public && firebase serve"
  },
  "keywords": ["ebook", "digital-products", "firebase"],
  "author": "Thư viện Sơn Nhai",
  "license": "UNLICENSED",
  "private": true
}
```

### Step 2.3: Run Preparation
```bash
node prepare-public.js
```

**Verify:**
- `public/` folder created
- 13 HTML files copied
- `css/` and `js/` folders copied
- Images copied

---

## 🔧 PHASE 3: SETUP FUNCTIONS (2 giờ)

### Step 3.1: Initialize Functions
```bash
cd functions
npm init -y
```

### Step 3.2: Install Dependencies
```bash
npm install express cors helmet cookie-parser express-rate-limit firebase-admin firebase-functions dotenv bcryptjs jsonwebtoken nodemailer uuid
```

### Step 3.3: Create functions/index.js
```javascript
const functions = require('firebase-functions');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const app = express();

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200
});
app.use(limiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Placeholder routes (will add real routes later)
app.get('/api/products', (req, res) => {
  res.json({ message: 'Products API - Coming soon' });
});

// Export
exports.api = functions
  .region('asia-southeast1')  // Singapore region
  .runWith({
    timeoutSeconds: 60,
    memory: '512MB'
  })
  .https.onRequest(app);
```

### Step 3.4: Create functions/.env
```bash
# Copy from backend/.env
cp ../backend/.env .env

# Add Firebase-specific vars
echo "FIREBASE_PROJECT_ID=your-project-id" >> .env
```

### Step 3.5: Update functions/package.json
```json
{
  "name": "functions",
  "description": "Cloud Functions for Thư viện Sơn Nhai",
  "engines": {
    "node": "22"
  },
  "main": "index.js",
  "dependencies": {
    "express": "^4.22.1",
    "cors": "^2.8.6",
    "helmet": "^7.2.0",
    "cookie-parser": "^1.4.7",
    "express-rate-limit": "^7.5.1",
    "firebase-admin": "^13.8.0",
    "firebase-functions": "^6.1.1",
    "dotenv": "^16.6.1",
    "bcryptjs": "^2.4.3",
    "jsonwebtoken": "^9.0.3",
    "nodemailer": "^6.10.1",
    "uuid": "^9.0.1"
  }
}
```

---

## 🔥 PHASE 4: CONFIGURE FIREBASE (30 phút)

### Step 4.1: Create firebase.json
```json
{
  "firestore": {
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": [
    {
      "source": "functions",
      "codebase": "default",
      "runtime": "nodejs22",
      "ignore": [
        "node_modules",
        ".git",
        "firebase-debug.log",
        "firebase-debug.*.log",
        "*.local"
      ]
    }
  ],
  "hosting": {
    "public": "public",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "/api/**",
        "function": {
          "functionId": "api",
          "region": "asia-southeast1"
        }
      }
    ],
    "headers": [
      {
        "source": "**/*.@(jpg|jpeg|gif|png|svg|webp)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=31536000, immutable"
          }
        ]
      },
      {
        "source": "**/*.@(js|css)",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=604800, must-revalidate"
          }
        ]
      },
      {
        "source": "**/*.html",
        "headers": [
          {
            "key": "Cache-Control",
            "value": "public, max-age=0, must-revalidate"
          }
        ]
      }
    ],
    "cleanUrls": true,
    "trailingSlash": false
  },
  "emulators": {
    "functions": {
      "port": 5001
    },
    "firestore": {
      "port": 8080
    },
    "hosting": {
      "port": 5000
    },
    "ui": {
      "enabled": true,
      "port": 4000
    },
    "singleProjectMode": true
  }
}
```

### Step 4.2: Create Firestore Rules
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    
    // Helper functions
    function isSignedIn() {
      return request.auth != null;
    }
    
    function isOwner(userId) {
      return isSignedIn() && request.auth.uid == userId;
    }
    
    function isAdmin() {
      return isSignedIn() && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Users
    match /users/{userId} {
      allow read: if isOwner(userId) || isAdmin();
      allow create: if isSignedIn();
      allow update: if isOwner(userId);
      allow delete: if isAdmin();
    }
    
    // Products (public read, admin write)
    match /products/{productId} {
      allow read: if true;
      allow write: if isAdmin();
    }
    
    // Orders
    match /orders/{orderId} {
      allow read: if isSignedIn() && 
        (resource.data.userId == request.auth.uid || isAdmin());
      allow create: if isSignedIn() && 
        request.resource.data.userId == request.auth.uid;
      allow update, delete: if isAdmin();
    }
    
    // Carts (server-side only for security)
    match /carts/{cartId} {
      allow read: if true;
      allow write: if false;  // Only server can write
    }
  }
}
```

### Step 4.3: Create firestore.indexes.json
```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "userId", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ],
  "fieldOverrides": []
}
```

### Step 4.4: Create .gitignore
```
# Firebase
.firebase/
firebase-debug.log
firebase-debug.*.log

# Functions
functions/node_modules/
functions/.env
functions/serviceAccountKey.json

# Public (generated)
public/

# Backup
backup-*/

# Environment
.env
.env.local

# Node
node_modules/
npm-debug.log

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db
```

---

## 🧪 PHASE 5: TEST WITH EMULATOR (1 giờ)

### Step 5.1: Start Emulator
```bash
firebase emulators:start
```

**Expected output:**
```
✔  All emulators ready!
┌─────────────┬────────────────┬─────────────────────────────────┐
│ Emulator    │ Host:Port      │ View in Emulator UI             │
├─────────────┼────────────────┼─────────────────────────────────┤
│ Functions   │ localhost:5001 │ http://localhost:4000/functions │
│ Firestore   │ localhost:8080 │ http://localhost:4000/firestore │
│ Hosting     │ localhost:5000 │ n/a                             │
└─────────────┴────────────────┴─────────────────────────────────┘
```

### Step 5.2: Test Checklist

**Frontend (http://localhost:5000):**
- [ ] Trang chủ load đúng
- [ ] CSS/JS load không lỗi
- [ ] Images hiển thị
- [ ] Navigation hoạt động
- [ ] Responsive trên mobile

**API (http://localhost:5001/api):**
- [ ] Health check: `curl http://localhost:5001/api/health`
- [ ] Response 200 OK
- [ ] JSON format đúng

**Emulator UI (http://localhost:4000):**
- [ ] Firestore tab hiển thị
- [ ] Functions tab hiển thị
- [ ] Logs tab hoạt động

### Step 5.3: Fix Issues
Nếu có lỗi:
1. Check logs trong terminal
2. Check Emulator UI → Logs
3. Fix code
4. Restart emulator: `Ctrl+C` → `firebase emulators:start`

---

## 🚀 PHASE 6: DEPLOY STAGING (30 phút)

### Step 6.1: Deploy to Preview Channel
```bash
# Deploy to preview channel (expires in 7 days)
firebase hosting:channel:deploy preview --expires 7d
```

**Output:**
```
✔  Deploy complete!

Channel URL (preview): https://your-project--preview-xxxxx.web.app
Expires: 2026-05-08 20:30:00
```

### Step 6.2: Test Preview URL

**Test checklist:**
- [ ] Open preview URL in browser
- [ ] Test trang chủ
- [ ] Test navigation
- [ ] Test API: `https://your-project--preview-xxxxx.web.app/api/health`
- [ ] Check browser console (no errors)
- [ ] Test on mobile device

### Step 6.3: Monitor Functions
```bash
# Watch logs in real-time
firebase functions:log --only api
```

---

## 🎯 PHASE 7: DEPLOY PRODUCTION (30 phút)

### Step 7.1: Final Checks
```bash
# Verify no uncommitted changes
git status

# Verify emulator tests passed
# Verify preview channel works

# Create git tag
git tag -a v1.0.0 -m "First production deployment"
git push origin v1.0.0
```

### Step 7.2: Deploy Firestore Rules First
```bash
firebase deploy --only firestore:rules
```

**Verify:** No errors, rules deployed

### Step 7.3: Deploy Functions
```bash
firebase deploy --only functions
```

**Expected time:** 3-5 minutes

**Verify:**
- Functions deployed successfully
- Test: `curl https://asia-southeast1-your-project.cloudfunctions.net/api/health`

### Step 7.4: Deploy Hosting
```bash
firebase deploy --only hosting
```

**Expected time:** 1-2 minutes

**Verify:**
- Hosting deployed
- URL: `https://your-project.web.app`

### Step 7.5: Full Deploy (Alternative)
```bash
# Or deploy everything at once
firebase deploy
```

---

## ✅ PHASE 8: POST-DEPLOYMENT VERIFICATION (30 phút)

### Step 8.1: Smoke Tests

**Production URL:** `https://your-project.web.app`

**Test checklist:**
- [ ] Homepage loads (< 3s)
- [ ] All pages accessible
- [ ] API health check works
- [ ] No console errors
- [ ] Images load
- [ ] Fonts load
- [ ] CSS/JS load

### Step 8.2: Functional Tests
- [ ] Browse products
- [ ] Add to cart (if backend ready)
- [ ] View cart
- [ ] Admin login (if backend ready)

### Step 8.3: Performance Check
```bash
# Run Lighthouse
npx lighthouse https://your-project.web.app --view
```

**Target scores:**
- Performance: ≥ 90
- Accessibility: ≥ 90
- Best Practices: ≥ 90
- SEO: ≥ 90

### Step 8.4: Monitor Logs
```bash
# Watch for errors
firebase functions:log --only api

# Check Firestore usage
firebase firestore:usage
```

---

## 🔄 ROLLBACK PLAN

### If Hosting Fails:
```bash
# List recent deploys
firebase hosting:clone --list

# Rollback to previous version
firebase hosting:rollback
```

### If Functions Fail:
```bash
# Delete broken function
firebase functions:delete api

# Redeploy from previous commit
git checkout <previous-commit>
firebase deploy --only functions
```

### If Everything Fails:
```bash
# Restore from backup
cp backup-20260501-202631/*.html .
cp -r backup-20260501-202631/js .

# Redeploy
npm run deploy
```

---

## 📊 MONITORING & MAINTENANCE

### Daily Checks (First Week)
- [ ] Check Functions logs for errors
- [ ] Monitor Firestore usage
- [ ] Check hosting bandwidth
- [ ] Review error reports

### Weekly Checks
- [ ] Review Firebase usage/costs
- [ ] Check for security alerts
- [ ] Update dependencies
- [ ] Backup Firestore data

### Tools
```bash
# View project info
firebase projects:list

# Check quota
firebase firestore:usage

# View logs
firebase functions:log

# Check hosting
firebase hosting:sites:list
```

---

## 💰 COST ESTIMATION

### Free Tier (Spark Plan)
- Hosting: 10GB storage, 360MB/day bandwidth
- Functions: 125K invocations/month
- Firestore: 50K reads, 20K writes/day

### Estimated Costs (Blaze Plan)
**Assuming 1000 users/day:**
- Functions: ~50K calls/day → $6/month
- Firestore: ~100K reads/day → $18/month
- Hosting: ~5GB bandwidth/month → $0.75/month
- **Total: ~$25/month**

---

## 📝 DEPLOYMENT LOG TEMPLATE

```
=== DEPLOYMENT LOG ===
Date: 2026-05-01
Time: 20:30 UTC
Version: 1.0.0
Deployed by: [Your Name]

Pre-deployment:
- [x] Code review completed
- [x] Tests passed
- [x] Backup created
- [x] Emulator tests passed

Deployment:
- [x] Firestore rules deployed
- [x] Functions deployed
- [x] Hosting deployed

Post-deployment:
- [x] Smoke tests passed
- [x] Performance check passed
- [x] No errors in logs

Issues: None
Rollback: Not needed

Production URL: https://your-project.web.app
Functions URL: https://asia-southeast1-your-project.cloudfunctions.net/api

Notes:
- First production deployment
- Backend still using mock data
- Payment integration pending
```

---

## 🎓 LESSONS LEARNED

### Do's ✅
- Always test with emulator first
- Deploy to preview channel before production
- Keep detailed logs
- Have rollback plan ready
- Monitor after deployment

### Don'ts ❌
- Don't deploy without testing
- Don't skip backup
- Don't deploy on Friday evening
- Don't ignore warnings
- Don't deploy all at once

---

## 📞 SUPPORT & TROUBLESHOOTING

### Common Issues

**1. Functions timeout:**
- Increase timeout in firebase.json
- Optimize code
- Check database queries

**2. CORS errors:**
- Verify cors config in functions
- Check origin whitelist

**3. Firestore permission denied:**
- Review security rules
- Check authentication

**4. High costs:**
- Review Functions invocations
- Check for infinite loops
- Optimize queries

### Get Help
- Firebase Console: https://console.firebase.google.com
- Firebase Docs: https://firebase.google.com/docs
- Stack Overflow: [firebase] tag
- Firebase Support: https://firebase.google.com/support

---

## ✨ SUCCESS CRITERIA

Deployment is successful when:
- ✅ All pages load without errors
- ✅ API health check returns 200
- ✅ No console errors
- ✅ Lighthouse score ≥ 90
- ✅ No errors in Functions logs
- ✅ Firestore rules working
- ✅ Mobile responsive
- ✅ Performance acceptable (< 3s load)

---

**Kế hoạch này đảm bảo:**
- 🛡️ **An toàn:** Test kỹ trước khi deploy, có rollback plan
- 📦 **Gọn gàng:** Từng bước rõ ràng, dễ follow
- ✅ **Chất lượng:** Verify ở mọi bước, monitoring sau deploy
- 📚 **Có tài liệu:** Mọi thứ được ghi chép đầy đủ

**Estimated total time:** 6-8 giờ (không tính migrate backend)
