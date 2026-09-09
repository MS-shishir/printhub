import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import { advancedClassicalMatting } from './test_advanced_matting.mjs';

const img = await loadImage('scratch/couple_photo.png');
const canvas = createCanvas(img.width, img.height);
const ctx = canvas.getContext('2d');
ctx.drawImage(img, 0, 0);

const out = advancedClassicalMatting(canvas);
fs.writeFileSync('scratch/couple_out.png', out.toBuffer('image/png'));
console.log('Saved scratch/couple_out.png');
