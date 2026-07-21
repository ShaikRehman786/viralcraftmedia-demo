import { readFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function check(file, label, pattern) {
  const path = join(root, file);
  try {
    const content = readFileSync(path, 'utf8');
    const found = content.includes(pattern);
    console.log('  ' + (found ? 'OK' : 'MISSING') + ': ' + label);
    return found;
  } catch(e) {
    console.log('  ERROR: ' + label + ' - ' + e.message);
    return false;
  }
}

console.log('=== END-TO-END WIRING AUDIT ===\n');

console.log('1. notificationService.js integration:');
check('backend/services/notificationService.js', 'imports sendPushToUser', 'import { sendPushToUser, sendPushToStaff }');
check('backend/services/notificationService.js', 'sendPushToStaff call in notifyStaff', 'sendPushToStaff(validNotifications[0])');
check('backend/services/notificationService.js', 'sendPushToUser call in notifyUser', 'sendPushToUser(userId, notify)');

console.log('\n2. routes/index.js push route mounting:');
check('backend/routes/index.js', 'imports pushRoutes', "import pushRoutes from './push.js'");
check('backend/routes/index.js', 'mounts /push', "router.use('/push', pushRoutes)");

console.log('\n3. push routes:');
check('backend/routes/push.js', 'GET /vapid-public-key', "get('/vapid-public-key'");
check('backend/routes/push.js', 'POST /subscribe', "post('/subscribe'");
check('backend/routes/push.js', 'POST /unsubscribe', "post('/unsubscribe'");

console.log('\n4. pushService.js exports:');
check('backend/services/pushService.js', 'export subscribe', 'export async function subscribe');
check('backend/services/pushService.js', 'export unsubscribe', 'export async function unsubscribe');
check('backend/services/pushService.js', 'export sendPushToUser', 'export async function sendPushToUser');
check('backend/services/pushService.js', 'export sendPushToStaff', 'export async function sendPushToStaff');
check('backend/services/pushService.js', 'export getVapidPublicKey', 'export function getVapidPublicKey');
check('backend/services/pushService.js', 'setVapidDetails', 'webpush.setVapidDetails');
check('backend/services/pushService.js', 'buildPayload function', 'function buildPayload');
check('backend/services/pushService.js', 'sendToSubscription helper', 'async function sendToSubscription');

console.log('\n5. env.js VAPID config:');
check('backend/config/env.js', 'vapidPublicKey', 'vapidPublicKey:');
check('backend/config/env.js', 'vapidPrivateKey', 'vapidPrivateKey:');
check('backend/config/env.js', 'vapidSubject', 'vapidSubject:');

console.log('\n6. .env VAPID keys:');
check('backend/.env', 'VAPID_PUBLIC_KEY', 'VAPID_PUBLIC_KEY=');
check('backend/.env', 'VAPID_PRIVATE_KEY', 'VAPID_PRIVATE_KEY=');
check('backend/.env', 'VAPID_SUBJECT', 'VAPID_SUBJECT=');

console.log('\n7. package.json web-push:');
const pkg = JSON.parse(readFileSync('backend/package.json', 'utf8'));
console.log('  ' + (pkg.dependencies['web-push'] ? 'OK: web-push@' + pkg.dependencies['web-push'] : 'MISSING'));

console.log('\n8. Frontend integration:');
check('src/services/pushInit.js', 'initPushNotifications export', 'export async function initPushNotifications');
check('src/services/pushInit.js', 'registerServiceWorker', 'async function registerServiceWorker');
check('src/services/pushInit.js', 'subscribeToPush', 'async function subscribeToPush');
check('src/services/pushInit.js', 'urlBase64ToUint8Array', 'function urlBase64ToUint8Array');
check('src/services/pushInit.js', 'getVapidPublicKey', 'async function getVapidPublicKey');
check('src/components/DashboardPage.jsx', 'imports initPushNotifications', "import { initPushNotifications } from '../services/pushInit.js'");
check('src/components/DashboardPage.jsx', 'calls initPushNotifications', 'initPushNotifications()');

console.log('\n9. Service Worker:');
check('public/sw.js', 'push event listener', "self.addEventListener('push'");
check('public/sw.js', 'notificationclick event', "self.addEventListener('notificationclick'");
check('public/sw.js', 'pushsubscriptionchange event', "self.addEventListener('pushsubscriptionchange'");
check('public/sw.js', 'fetch event (cache)', "self.addEventListener('fetch'");
check('public/sw.js', 'install event', "self.addEventListener('install'");
check('public/sw.js', 'activate event', "self.addEventListener('activate'");
check('public/sw.js', 'uses showNotification', 'showNotification');
check('public/sw.js', 'clients.openWindow', 'clients.openWindow');
check('public/sw.js', 'navigates to URL', 'client.navigate(url)');

console.log('\n10. Manifest:');
const manifest = JSON.parse(readFileSync('public/manifest.json', 'utf8'));
console.log('  OK: name = ' + manifest.name);
console.log('  OK: short_name = ' + manifest.short_name);
console.log('  OK: theme_color = ' + manifest.theme_color);
console.log('  OK: background_color = ' + manifest.background_color);
console.log('  OK: icons count = ' + manifest.icons.length);

console.log('\n11. index.html PWA tags:');
const html = readFileSync('index.html', 'utf8');
console.log('  ' + (html.includes('manifest.json') ? 'OK: manifest link' : 'MISSING'));
console.log('  ' + (html.includes('theme-color') ? 'OK: theme-color meta' : 'MISSING'));
console.log('  ' + (html.includes('apple-mobile-web-app') ? 'OK: apple-mobile meta' : 'MISSING'));
console.log('  ' + (html.includes('apple-touch-icon') ? 'OK: apple-touch-icon' : 'MISSING'));

console.log('\n12. Build output has SW + manifest:');
const distSw = readFileSync('dist/sw.js', 'utf8');
console.log('  ' + (distSw.includes('showNotification') ? 'OK: dist/sw.js has push logic' : 'MISSING'));
const distManifest = JSON.parse(readFileSync('dist/manifest.json', 'utf8'));
console.log('  OK: dist/manifest.json name = ' + distManifest.name);

console.log('\n=== AUDIT COMPLETE ===');
