const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const DIR = path.join(__dirname, 'product', 'anh-chuan');

async function removeCheckerboard(filePath, outputPath) {
  const { data, info } = await sharp(filePath).raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  
  // Detect block size from top-left corner
  const row0 = [];
  for (let x = 0; x < Math.min(60, width); x++) {
    const idx = x * channels;
    row0.push({ r: data[idx], g: data[idx+1], b: data[idx+2] });
  }
  
  let transitionPoints = [];
  for (let i = 1; i < row0.length; i++) {
    const d = Math.abs(row0[i-1].r - row0[i].r) + Math.abs(row0[i-1].g - row0[i].g) + Math.abs(row0[i-1].b - row0[i].b);
    if (d > 20) transitionPoints.push(i);
  }
  
  let blockSize = 10;
  if (transitionPoints.length >= 2) {
    const gaps = [];
    for (let i = 1; i < transitionPoints.length; i++) gaps.push(transitionPoints[i] - transitionPoints[i-1]);
    const gapCounts = {};
    gaps.forEach(g => gapCounts[g] = (gapCounts[g] || 0) + 1);
    blockSize = parseInt(Object.entries(gapCounts).sort((a,b) => b[1]-a[1])[0][0]);
    if (blockSize < 4 || blockSize > 32) blockSize = 10;
  }
  
  // Get checker colors from first two blocks
  function avgColor(cx, cy, s) {
    let tr=0,tg=0,tb=0,c=0;
    for (let y=cy; y<Math.min(cy+s,height); y++)
      for (let x=cx; x<Math.min(cx+s,width); x++) {
        const i=(y*width+x)*channels;
        tr+=data[i]; tg+=data[i+1]; tb+=data[i+2]; c++;
      }
    return {r:Math.round(tr/c),g:Math.round(tg/c),b:Math.round(tb/c)};
  }
  
  const c1 = avgColor(0, 0, blockSize);
  const c2 = avgColor(blockSize, 0, blockSize);
  
  console.log(`  Block: ${blockSize}px, Colors: rgb(${c1.r},${c1.g},${c1.b}) / rgb(${c2.r},${c2.g},${c2.b})`);
  
  function expectedColor(x, y) {
    return (Math.floor(x/blockSize) + Math.floor(y/blockSize)) % 2 === 0 ? c1 : c2;
  }
  
  // Higher tolerance to catch JPEG-blurred borders
  const tolerance = 45;
  
  function isCheckerLike(x, y) {
    const idx = (y*width+x)*channels;
    const r=data[idx], g=data[idx+1], b=data[idx+2];
    const e = expectedColor(x, y);
    return Math.abs(r-e.r)+Math.abs(g-e.g)+Math.abs(b-e.b) < tolerance;
  }
  
  // Also check if a pixel is "grayish-white" (could be checker in any phase)
  function isGrayWhite(x, y) {
    const idx = (y*width+x)*channels;
    const r=data[idx], g=data[idx+1], b=data[idx+2];
    const maxDiff = Math.max(Math.abs(r-g), Math.abs(r-b), Math.abs(g-b));
    // Both checker colors are near-white or near-gray
    const minC = Math.min(c1.r, c2.r, c1.g, c2.g, c1.b, c2.b) - 20;
    return maxDiff < 20 && r >= minC && g >= minC && b >= minC;
  }
  
  // Mark checker pixels
  const mask = new Uint8Array(width * height); // 0=content, 1=checker
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (isCheckerLike(x, y)) {
        mask[y*width+x] = 1;
      }
    }
  }
  
  // Flood fill from borders - only keep border-connected checker regions
  const connected = new Uint8Array(width * height);
  const queue = [];
  
  for (let x = 0; x < width; x++) {
    if (mask[x]) { connected[x] = 1; queue.push(x); }
    const bot = (height-1)*width+x;
    if (mask[bot]) { connected[bot] = 1; queue.push(bot); }
  }
  for (let y = 0; y < height; y++) {
    if (mask[y*width]) { connected[y*width] = 1; queue.push(y*width); }
    const r = y*width+width-1;
    if (mask[r]) { connected[r] = 1; queue.push(r); }
  }
  
  let qi = 0;
  while (qi < queue.length) {
    const pos = queue[qi++];
    const x = pos % width;
    const y = (pos - x) / width;
    
    for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]) {
      const nx=x+dx, ny=y+dy;
      if (nx<0||nx>=width||ny<0||ny>=height) continue;
      const npos = ny*width+nx;
      if (!connected[npos] && (mask[npos] || isGrayWhite(nx, ny))) {
        connected[npos] = 1;
        queue.push(npos);
      }
    }
  }
  
  // Dilate the connected mask by 2px to clean up edges
  const dilated = new Uint8Array(connected);
  for (let pass = 0; pass < 2; pass++) {
    const src = pass === 0 ? connected : dilated;
    for (let y = 1; y < height-1; y++) {
      for (let x = 1; x < width-1; x++) {
        if (!src[y*width+x]) {
          // Check if neighbor is background and this pixel is grayish
          let hasBgNeighbor = false;
          for (const [dx,dy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
            if (src[(y+dy)*width+(x+dx)]) { hasBgNeighbor = true; break; }
          }
          if (hasBgNeighbor && isGrayWhite(x, y)) {
            dilated[y*width+x] = 1;
          }
        }
      }
    }
  }
  
  // Write output with anti-aliased edges
  const outBuf = Buffer.alloc(width * height * 4);
  let removed = 0;
  
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const srcIdx = (y*width+x)*channels;
      const dstIdx = (y*width+x)*4;
      
      if (dilated[y*width+x]) {
        outBuf[dstIdx] = outBuf[dstIdx+1] = outBuf[dstIdx+2] = outBuf[dstIdx+3] = 0;
        removed++;
      } else {
        outBuf[dstIdx] = data[srcIdx];
        outBuf[dstIdx+1] = data[srcIdx+1];
        outBuf[dstIdx+2] = data[srcIdx+2];
        outBuf[dstIdx+3] = 255;
      }
    }
  }
  
  // Edge softening - fade edges near transparent areas
  const finalBuf = Buffer.from(outBuf);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pos = y*width+x;
      const dstIdx = pos*4;
      if (outBuf[dstIdx+3] === 255) {
        let tCount = 0, total = 0;
        for (let dy=-2; dy<=2; dy++) {
          for (let dx=-2; dx<=2; dx++) {
            const nx=x+dx, ny=y+dy;
            if (nx<0||nx>=width||ny<0||ny>=height) continue;
            total++;
            if (outBuf[(ny*width+nx)*4+3] === 0) tCount++;
          }
        }
        if (tCount > 0 && total > 0) {
          const ratio = tCount / total;
          if (ratio > 0.3) {
            finalBuf[dstIdx+3] = Math.round(255 * (1 - ratio * 0.8));
          }
        }
      }
    }
  }
  
  console.log(`  Removed ${removed} / ${width*height} pixels (${(removed*100/width/height).toFixed(1)}%)`);
  
  await sharp(finalBuf, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 9 })
    .toFile(outputPath);
  
  const stats = fs.statSync(outputPath);
  console.log(`  Saved: ${path.basename(outputPath)} (${(stats.size/1024).toFixed(0)}KB)`);
}

async function main() {
  const files = fs.readdirSync(DIR).filter(f => f.endsWith('.jpeg'));
  console.log(`Processing ${files.length} files...\n`);
  
  for (const file of files) {
    console.log(`Processing: ${file}`);
    await removeCheckerboard(
      path.join(DIR, file),
      path.join(DIR, file.replace('.jpeg', '.png'))
    );
  }
  console.log('\nDone!');
}

main().catch(console.error);
