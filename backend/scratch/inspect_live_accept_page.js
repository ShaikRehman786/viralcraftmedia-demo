async function main() {
  const jsRes = await fetch('https://viralcraftmedia-demo.vercel.app/assets/AcceptInvitationPage-o2iMx6xn.js');
  const code = await jsRes.text();
  console.log('AcceptInvitationPage size:', code.length);
  console.log('Snippet 1 (start):', code.substring(0, 1000));

  // Find all occurrences of verify-invitation
  let pos = 0;
  while ((pos = code.indexOf('verify-invitation', pos)) !== -1) {
    console.log('\n--- verify-invitation match at', pos, '---');
    console.log(code.substring(Math.max(0, pos - 150), Math.min(code.length, pos + 250)));
    pos += 17;
  }

  // Find how token is extracted
  const tokenIdx = code.indexOf('token');
  console.log('\n--- token context ---');
  console.log(code.substring(Math.max(0, tokenIdx - 50), Math.min(code.length, tokenIdx + 300)));
}

main().catch(console.error);
