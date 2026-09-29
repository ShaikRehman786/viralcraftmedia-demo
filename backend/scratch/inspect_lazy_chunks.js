async function main() {
  const jsRes = await fetch('https://viralcraftmedia-demo.vercel.app/assets/index-Etpj08Sh.js');
  const code = await jsRes.text();
  console.log('Searching for routes in index-Etpj08Sh.js...');
  const routes = [...code.matchAll(/path:\"([^\"]+)\"/g)].map(m => m[1]);
  console.log('Routes in bundle:', routes);

  // Look for lazy loaded chunks
  const chunkMatches = [...code.matchAll(/\/assets\/[a-zA-Z0-9_\-]+\.js/g)].map(m => m[0]);
  console.log('Referenced chunks:', chunkMatches);

  for (const chunk of chunkMatches) {
    const chunkRes = await fetch('https://viralcraftmedia-demo.vercel.app' + chunk);
    const chunkCode = await chunkRes.text();
    if (chunkCode.includes('verify-invitation') || chunkCode.includes('Invitation unavailable') || chunkCode.includes('The invitation link is invalid')) {
      console.log(`FOUND invitation code in chunk ${chunk}!`);
      const idx = chunkCode.indexOf('verify-invitation');
      if (idx !== -1) {
        console.log('verify-invitation snippet:');
        console.log(chunkCode.substring(Math.max(0, idx - 150), Math.min(chunkCode.length, idx + 250)));
      }
      const idxErr = chunkCode.indexOf('The invitation link is invalid');
      if (idxErr !== -1) {
        console.log('error snippet:');
        console.log(chunkCode.substring(Math.max(0, idxErr - 150), Math.min(chunkCode.length, idxErr + 250)));
      }
    }
  }
}

main().catch(console.error);
