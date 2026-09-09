import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import { universalMatting } from './test_robust_matting.mjs';

const userUploadDir = 'C:\\Users\\IT\\.gemini\\antigravity-ide\\brain\\df9b4638-f12a-4656-bf65-74c4e0bc88ac\\.user_uploaded';
const f = 'media_1788590987087.png';
const p = `${userUploadDir}/${f}`;

if (fs.existsSync(p)) {
  const img = await loadImage(p);
  const c = createCanvas(img.width, img.height);
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const res = universalMatting(c);
  fs.writeFileSync(`scratch/universal_${f}`, res.toBuffer('image/png'));
  console.log(`Saved scratch/universal_${f}`);
}
