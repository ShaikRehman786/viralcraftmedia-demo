async function main() {
  const r = await fetch('https://viralcraftmedia-demo.vercel.app/register');
  console.log('Status:', r.status);
  const html = await r.text();
  const jsMatches = [...html.matchAll(/\/assets\/[^\s"'<>]+\.js/g)].map(m => m[0]);
  console.log('JS assets:', jsMatches);

  for (const js of jsMatches) {
    const jsRes = await fetch('https://viralcraftmedia-demo.vercel.app' + js);
    const code = await jsRes.text();
    console.log(`Checking ${js} (${code.length} bytes)...`);
    if (code.includes('verify-invitation') || code.includes('AcceptInvitation') || code.includes('/register') || code.includes('Invitation unavailable')) {
      console.log(`FOUND invitation code in ${js}!`);
      // Search for verify-invitation endpoint call
      const idx = code.indexOf('verify-invitation');
      if (idx !== -1) {
        console.log('Snippet around verify-invitation:');
        console.log(code.substring(Math.max(0, idx - 150), Math.min(code.length, idx + 250)));
      }
      const idxBase = code.indexOf('baseURL');
      if (idxBase !== -1) {
        console.log('Snippet around baseURL:');
        console.log(code.substring(Math.max(0, idxBase - 100), Math.min(code.length, idxBase + 200)));
      }
    }
  }
}

main().catch(console.error);
