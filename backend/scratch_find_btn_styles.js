import fs from 'fs';

const content = fs.readFileSync('d:/Clients/viralcraftmedia/src/index.css', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('.btn-ghost') || line.includes('.btn-icon') || (line.includes('.btn') && line.includes('{'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
