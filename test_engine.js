import fs from 'fs';
import path from 'path';

// Test if we can read the user uploaded image
const imagePath = 'C:\\Users\\IT\\.gemini\\antigravity-ide\\brain\\df9b4638-f12a-4656-bf65-74c4e0bc88ac\\.user_uploaded\\media_1788579236491.png';
const exists = fs.existsSync(imagePath);
console.log('Sample image exists:', exists);
if (exists) {
  const stat = fs.statSync(imagePath);
  console.log('Size:', stat.size, 'bytes');
}
