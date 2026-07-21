const fs = require('fs');
const path = require('path');

const cssPath = path.join(__dirname, '../src/index.css');
const stylesPath = path.join(__dirname, 'new_styles.css');

let content = fs.readFileSync(cssPath, 'utf8');
const newStyles = fs.readFileSync(stylesPath, 'utf8');

// Find the line separator sequence (CRLF or LF)
const isCrlf = content.includes('\r\n');
const lines = isCrlf ? content.split('\r\n') : content.split('\n');

// Line 1850 is index 1849
const keepLines = lines.slice(0, 1849);

const updatedContent = keepLines.join(isCrlf ? '\r\n' : '\n') + (isCrlf ? '\r\n' : '\n') + newStyles;
fs.writeFileSync(cssPath, updatedContent, 'utf8');
console.log('Successfully wrote cream styling overrides from new_styles.css to index.css!');
