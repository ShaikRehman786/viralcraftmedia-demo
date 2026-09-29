async function main() {
  const jsRes = await fetch('https://viralcraftmedia-demo.vercel.app/assets/index-Etpj08Sh.js');
  const code = await jsRes.text();
  console.log('Total length:', code.length);
  // Find all string literals in the code ending in .js
  const jsFiles = [...code.matchAll(/["']([^"']+\.js)["']/g)].map(m => m[1]);
  console.log('All .js strings:', jsFiles);

  // Search for AcceptInvitation in code
  console.log('Includes AcceptInvitation:', code.includes('AcceptInvitation'));
  console.log('Includes /register:', code.includes('/register'));
  console.log('Includes /invite:', code.includes('/invite'));
  console.log('Includes unavailable:', code.includes('unavailable'));

  const regIdx = code.indexOf('/register');
  if (regIdx !== -1) {
    console.log('/register context:', code.substring(Math.max(0, regIdx - 100), Math.min(code.length, regIdx + 200)));
  }
}

main().catch(console.error);
