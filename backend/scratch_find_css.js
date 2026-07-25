import fs from 'fs';

const content = fs.readFileSync('d:/Clients/viralcraftmedia/src/index.css', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('dialog') || line.includes('close') || line.includes('btn-icon')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
