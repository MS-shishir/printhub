import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

const userUploadDir = 'C:\\Users\\IT\\.gemini\\antigravity-ide\\brain\\df9b4638-f12a-4656-bf65-74c4e0bc88ac\\.user_uploaded';
const file = 'media_1788590987087.png';
const p = path.join(userUploadDir, file);
const img = await loadImage(p);
console.log(`Image ${file}: ${img.width}x${img.height}`);

// Let's copy it to scratch
fs.copyFileSync(p, 'scratch/couple_photo.png');
console.log('Saved scratch/couple_photo.png');
