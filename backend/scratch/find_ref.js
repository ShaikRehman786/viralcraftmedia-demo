import fs from 'fs';
import path from 'path';

const filePath = 'd:/Clients/viralcraftmedia/src/components/DashboardPage.jsx';
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
console.log(`Searching in DashboardPage.jsx (${lines.length} lines):`);

lines.forEach((line, idx) => {
  if (line.includes('setActiveTab') || line.includes('navigate') || line.includes('window.location')) {
    console.log(`L${idx + 1}: ${line.trim()}`);
  }
});
process.exit(0);
