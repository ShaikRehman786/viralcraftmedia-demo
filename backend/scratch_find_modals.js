import fs from 'fs';
import path from 'path';

const dir = 'd:/Clients/viralcraftmedia/src/components';
const files = fs.readdirSync(dir);

files.forEach(file => {
  const filepath = path.join(dir, file);
  if (fs.statSync(filepath).isFile() && filepath.endsWith('.jsx')) {
    const content = fs.readFileSync(filepath, 'utf8');
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('dialog-header') || line.includes('dialog') || line.includes('lucide-react')) {
        if (line.includes('X') || line.includes('x') || line.includes('Close') || line.includes('close')) {
          console.log(`${file}:${idx + 1}: ${line.trim()}`);
        }
      }
    });
  }
});
