import fs from 'fs';

const content = fs.readFileSync('d:/Clients/viralcraftmedia/src/components/DashboardPage.jsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('<X ') || line.includes('<X>')) {
    console.log(`${idx + 1}: ${line.trim()}`);
  }
});
