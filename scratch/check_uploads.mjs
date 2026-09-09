import { loadImage } from 'canvas';
import fs from 'fs';
import path from 'path';

const userUploadDir = 'C:\\Users\\IT\\.gemini\\antigravity-ide\\brain\\df9b4638-f12a-4656-bf65-74c4e0bc88ac\\.user_uploaded';
const files = fs.readdirSync(userUploadDir);
console.log('User uploaded files:', files);

for (const f of files) {
  const stat = fs.statSync(path.join(userUploadDir, f));
  console.log(`${f}: ${stat.size} bytes, time: ${stat.mtime}`);
}
