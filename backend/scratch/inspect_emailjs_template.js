import { config } from '../config/env.js';

async function main() {
  console.log('Testing EmailJS template fetch with private key...');
  const res = await fetch(`https://api.emailjs.com/api/v1.1/templates/${config.emailjsTemplateId}`, {
    headers: {
      'Authorization': `Bearer ${config.emailjsPrivateKey}`
    }
  });
  console.log('Status:', res.status);
  const text = await res.text();
  console.log('Response:', text);
}

main().catch(console.error);
