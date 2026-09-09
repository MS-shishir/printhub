import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

const testFiles = [
  'scratch/universal_media_1788584939190.png',
  'scratch/universal_media_1788585250142.png',
  'scratch/universal_media_1788585940388.png',
  'scratch/universal_media_1788586948023.png',
  'scratch/universal_media_1788587194609.png'
];

for (const file of testFiles) {
  if (!fs.existsSync(file)) continue;
  const img = await loadImage(file);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, img.width, img.height).data;
  
  let fullyTrans = 0, fullyOpaque = 0, semiTrans = 0;
  for (let i = 3; i < data.length; i += 4) {
    const a = data[i];
    if (a === 0) fullyTrans++;
    else if (a === 255) fullyOpaque++;
    else semiTrans++;
  }
  const total = img.width * img.height;
  console.log(`${file} (${img.width}x${img.height}):`);
  console.log(`  Transparent (BG removed): ${fullyTrans} (${((fullyTrans/total)*100).toFixed(1)}%)`);
  console.log(`  Opaque (Subject retained): ${fullyOpaque} (${((fullyOpaque/total)*100).toFixed(1)}%)`);
  console.log(`  Semi-transparent (Smooth edges): ${semiTrans} (${((semiTrans/total)*100).toFixed(1)}%)`);
}
