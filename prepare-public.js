const fs = require('fs');
const path = require('path');

console.log(' Preparing frontend for deployment...\n');

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
  'seapay-return.html',
  'landing.html'
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
const dirs = ['css', 'js', 'chuan', 'demo', 'product'];
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
  // Convert jpeg to webp if webp version exists
  const webpVersion = img.replace(/\.(jpeg|jpg)$/i, '.webp');
  const webpPath = path.join('.', webpVersion);
  if (fs.existsSync(webpPath)) {
    fs.copyFileSync(webpPath, path.join('public', webpVersion));
  } else {
    fs.copyFileSync(img, path.join('public', img));
  }
});
console.log(`\n✓ Copied ${images.length} images`);

// Create .gitignore in public
// NOTE: Do NOT create .gitignore in public/ — it causes Vercel to skip files

console.log('\n Frontend preparation complete!');
console.log(` Files in public/: ${fs.readdirSync('public').length}`);

// Debug: verify chuan/ images in output
const chuanDir = path.join('public', 'chuan');
if (fs.existsSync(chuanDir)) {
  const chuanFiles = fs.readdirSync(chuanDir);
  console.log(`\n chuan/ has ${chuanFiles.length} files:`);
  chuanFiles.forEach(f => {
    const size = fs.statSync(path.join(chuanDir, f)).size;
    console.log(`  ${f} (${(size/1024).toFixed(0)}KB)`);
  });
} else {
  console.error('\n ERROR: public/chuan/ does NOT exist!');
}

