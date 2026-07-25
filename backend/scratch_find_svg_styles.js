import fs from 'fs';

const content = fs.readFileSync('d:/Clients/viralcraftmedia/src/index.css', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('svg') && (line.includes('stroke') || line.includes('opacity') || line.includes('display') || line.includes('visibility'))) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
