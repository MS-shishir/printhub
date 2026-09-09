import { createCanvas, loadImage } from 'canvas';
import fs from 'fs';

const img = await loadImage('scratch/universal_media_1788590987087.png');
const c = createCanvas(img.width, img.height);
const ctx = c.getContext('2d');
ctx.drawImage(img, 0, 0);
const data = ctx.getImageData(0, 0, img.width, img.height).data;

// Check man's hair area: x in [120, 180], y in [70, 110]
let hairTrans = 0, hairOpaque = 0;
for (let y = 70; y <= 110; y++) {
  for (let x = 120; x <= 180; x++) {
    const a = data[(y * img.width + x) * 4 + 3];
    if (a > 200) hairOpaque++;
    else hairTrans++;
  }
}
console.log(`Man's hair area: ${hairOpaque} opaque vs ${hairTrans} transparent`);

// Check man's beard area: x in [130, 170], y in [170, 200]
let beardTrans = 0, beardOpaque = 0;
for (let y = 170; y <= 200; y++) {
  for (let x = 130; x <= 170; x++) {
    const a = data[(y * img.width + x) * 4 + 3];
    if (a > 200) beardOpaque++;
    else beardTrans++;
  }
}
console.log(`Man's beard area: ${beardOpaque} opaque vs ${beardTrans} transparent`);

// Check woman's scarf: x in [350, 420], y in [190, 260]
let scarfTrans = 0, scarfOpaque = 0;
for (let y = 190; y <= 260; y++) {
  for (let x = 350; x <= 420; x++) {
    const a = data[(y * img.width + x) * 4 + 3];
    if (a > 200) scarfOpaque++;
    else scarfTrans++;
  }
}
console.log(`Woman's scarf area: ${scarfOpaque} opaque vs ${scarfTrans} transparent`);
