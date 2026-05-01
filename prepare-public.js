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
    console.log(`  ✓ ${file}`);
  }
});
console.log(`\n✓ Copied ${htmlCount} HTML files`);

// Copy directories
const dirs = ['css', 'js'];
dirs.forEach(dir => {
  if (fs.existsSync(dir)) {
    fs.cpSync(dir, path.join('public', dir), { recursive: true });
    console.log(`  ✓ ${dir}/`);
  }
});
console.log('\n✓ Copied directories');

// Copy individual JS files
const jsFiles = ['firebase.js', 'auth-ui.js', 'parallax.js'];
jsFiles.forEach(file => {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('public', file));
    console.log(`  ✓ ${file}`);
  }
});

// Copy images
const images = fs.readdirSync('.').filter(f =>
  /\.(jpg|jpeg|png|gif|svg|webp|ico)$/i.test(f)
);
images.forEach(img => {
  fs.copyFileSync(img, path.join('public', img));
});
console.log(`\n✓ Copied ${images.length} images`);

// Create .gitignore in public
fs.writeFileSync('public/.gitignore', '# Ignore everything\n*\n');

console.log('\n✅ Frontend preparation complete!');
console.log(`📁 Files in public/: ${fs.readdirSync('public').length}`);
