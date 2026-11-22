import { app, BrowserWindow, shell } from 'electron';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import tls from 'node:tls';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_ROOT = path.join(__dirname, 'app');
const ENTRY_HTML = 'index-crm.html';
const API_TARGET = String(process.env.VCM_API_TARGET || 'https://viralcraftmedia-demo.onrender.com').replace(/\/+$/, '');

let target;
try {
  target = new URL(API_TARGET);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') throw new Error('unsupported protocol');
} catch (err) {
  console.error(`[desktop] Invalid VCM_API_TARGET "${API_TARGET}": ${err.message}`);
  process.exit(1);
}
const IS_TLS = target.protocol === 'https:';
const TARGET_ORIGIN = target.origin;
const TARGET_PORT = Number(target.port) || (IS_TLS ? 443 : 80);

const cookieJar = new Map();

function jarHeader() {
  if (!cookieJar.size) return '';
  const now = Date.now();
  const parts = [];
  for (const [name, entry] of cookieJar) {
    if (entry.expiry && entry.expiry <= now) {
      cookieJar.delete(name);
      continue;
    }
    parts.push(`${name}=${entry.value}`);
  }
  return parts.join('; ');
}

function absorbSetCookie(setCookies) {
  for (const raw of setCookies) {
    const [pair, ...attrs] = String(raw).split(';');
    const eq = pair.indexOf('=');
    if (eq <= 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    let clear = false;
    let expiry = null;
    for (const attr of attrs) {
      const aeq = attr.indexOf('=');
      const key = (aeq === -1 ? attr : attr.slice(0, aeq)).trim().toLowerCase();
      const val = aeq === -1 ? '' : attr.slice(aeq + 1).trim();
      if (key === 'max-age') {
        const secs = Number(val);
        if (Number.isFinite(secs)) {
          if (secs <= 0) clear = true;
          else expiry = Date.now() + secs * 1000;
        }
      } else if (key === 'expires') {
        const t = Date.parse(val);
        if (!Number.isNaN(t)) {
          if (t <= Date.now()) clear = true;
          else expiry = t;
        }
      }
    }
    if (clear || !value) cookieJar.delete(name);
    else cookieJar.set(name, { value, expiry });
  }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.map': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.wav': 'audio/wav',
  '.mp3': 'audio/mpeg',
  '.pdf': 'application/pdf',
};

function buildCsp(port) {
  return [
    "default-src 'self'",
    "script-src 'self'",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    `connect-src 'self' http://127.0.0.1:${port} ws://127.0.0.1:${port}`,
    'frame-src https:',
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join('; ');
}

function proxyApi(req, res) {
  const logProxy = !!process.env.VCM_PROXY_LOG;
  if (logProxy) console.log(`[proxy] ${new Date().toISOString()} ${req.method} ${req.url}`);
  const headers = { ...req.headers };
  headers.host = target.host;
  headers.origin = TARGET_ORIGIN;
  delete headers.connection;
  delete headers['keep-alive'];
  const cookie = jarHeader();
  if (cookie) headers.cookie = cookie;
  else delete headers.cookie;

  const transport = IS_TLS ? https : http;
  const proxyReq = transport.request(
    {
      hostname: target.hostname,
      port: TARGET_PORT,
      method: req.method,
      path: req.url,
      headers,
    },
    (proxyRes) => {
      const outHeaders = { ...proxyRes.headers };
      const setCookies = proxyRes.headers['set-cookie'];
      if (setCookies) {
        if (logProxy) console.log(`[proxy] set-cookie -> ${setCookies.map((c) => c.split(';')[0]).join(', ')}`);
        absorbSetCookie(setCookies);
        delete outHeaders['set-cookie'];
      }
      delete outHeaders.connection;
      delete outHeaders['transfer-encoding'];
      delete outHeaders['keep-alive'];
      delete outHeaders['proxy-authenticate'];
      delete outHeaders['proxy-authorization'];
      delete outHeaders.te;
      delete outHeaders.trailers;
      delete outHeaders.upgrade;
      res.writeHead(proxyRes.statusCode || 502, outHeaders);
      proxyRes.pipe(res);
      proxyRes.on('error', () => res.destroy());
    },
  );

  proxyReq.on('error', () => {
    if (!res.headersSent) {
      res.writeHead(502, { 'content-type': 'application/json; charset=utf-8' });
      res.end(JSON.stringify({ error: 'Backend unreachable' }));
    } else {
      res.destroy();
    }
  });
  proxyReq.setTimeout(180000, () => proxyReq.destroy());
  req.on('error', () => proxyReq.destroy());
  req.pipe(proxyReq);
}

function sendFile(res, filePath, port) {
  fs.stat(filePath, (err, st) => {
    if (err || !st.isFile()) {
      res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath).toLowerCase();
    const headers = {
      'content-type': MIME[ext] || 'application/octet-stream',
      'x-content-type-options': 'nosniff',
      'cache-control': 'no-cache',
    };
    if (ext === '.html') headers['content-security-policy'] = buildCsp(port);
    res.writeHead(200, headers);
    const stream = fs.createReadStream(filePath);
    stream.on('error', () => res.destroy());
    stream.pipe(res);
  });
}

function createServer() {
  const server = http.createServer((req, res) => {
    const port = server.address()?.port || 0;
    let pathname;
    try {
      pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    } catch {
      res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Bad request');
      return;
    }

    if (pathname === '/api' || pathname.startsWith('/api/') || pathname.startsWith('/socket.io')) {
      proxyApi(req, res);
      return;
    }

    const rel = pathname === '/' ? ENTRY_HTML : pathname.replace(/^\/+/, '');
    const filePath = path.resolve(APP_ROOT, rel);
    if (filePath !== APP_ROOT && !filePath.startsWith(APP_ROOT + path.sep)) {
      res.writeHead(403, { 'content-type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.stat(filePath, (statErr, st) => {
      if (!statErr && st.isFile()) {
        sendFile(res, filePath, port);
        return;
      }
      if (path.extname(pathname)) {
        res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }
      sendFile(res, path.join(APP_ROOT, ENTRY_HTML), port);
    });
  });

  server.on('upgrade', (req, socket, head) => {
    if (!req.url || !req.url.startsWith('/socket.io')) {
      socket.destroy();
      return;
    }
    const headers = { ...req.headers };
    headers.host = target.host;
    headers.origin = TARGET_ORIGIN;
    const cookie = jarHeader();
    if (cookie) headers.cookie = cookie;
    else delete headers.cookie;

    const lines = [`${req.method} ${req.url} HTTP/1.1`];
    for (const [key, value] of Object.entries(headers)) {
      if (value == null) continue;
      if (Array.isArray(value)) {
        for (const item of value) lines.push(`${key}: ${item}`);
      } else {
        lines.push(`${key}: ${value}`);
      }
    }
    const requestBytes = Buffer.from(`${lines.join('\r\n')}\r\n\r\n`, 'utf8');

    let upstream;
    const attach = () => {
      upstream.on('error', () => socket.destroy());
      upstream.on('close', () => socket.destroy());
      socket.on('close', () => upstream.destroy());
      socket.on('error', () => upstream.destroy());
      upstream.write(requestBytes);
      if (head && head.length) upstream.write(head);
      upstream.pipe(socket);
      socket.pipe(upstream);
    };

    if (IS_TLS) {
      upstream = tls.connect({ host: target.hostname, port: TARGET_PORT, servername: target.hostname }, attach);
    } else {
      upstream = net.connect({ host: target.hostname, port: TARGET_PORT }, attach);
    }
    upstream.on('error', () => socket.destroy());
  });

  return server;
}

let mainWindow = null;
let localOrigin = '';

function guardWebContents(wc) {
  wc.setWindowOpenHandler(({ url }) => {
    try {
      const u = new URL(url);
      if (u.origin === localOrigin) {
        if (u.pathname === '/api' || u.pathname.startsWith('/api/')) {
          wc.downloadURL(url);
          return { action: 'deny' };
        }
        return { action: 'allow' };
      }
      if (u.protocol === 'https:' || u.protocol === 'http:') {
        shell.openExternal(url);
      }
      return { action: 'deny' };
    } catch {
      return { action: 'deny' };
    }
  });

  wc.on('will-navigate', (event, url) => {
    try {
      const u = new URL(url);
      if (u.origin === localOrigin) return;
      event.preventDefault();
      if (u.protocol === 'https:' || u.protocol === 'http:') shell.openExternal(url);
    } catch {
      event.preventDefault();
    }
  });

  wc.on('will-attach-webview', (event) => event.preventDefault());

  wc.on('console-message', (...args) => {
    let level = 'info';
    let message = '';
    let line = 0;
    let sourceId = '';
    const detail = args[1];
    if (detail && typeof detail === 'object') {
      level = detail.level ?? 'info';
      message = detail.message ?? '';
      line = detail.line ?? 0;
      sourceId = detail.sourceId ?? '';
    } else {
      level = detail ?? 'info';
      message = args[2] ?? '';
      line = args[3] ?? 0;
      sourceId = args[4] ?? '';
    }
    if (level === 'error' || level === 'warning') {
      console.log(`[renderer:${level}] ${message} (${sourceId}:${line})`);
    }
  });

  wc.on('render-process-gone', (_event, details) => {
    console.error(`[desktop] renderer gone: ${JSON.stringify(details)}`);
  });
}

app.on('web-contents-created', (_event, wc) => guardWebContents(wc));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    backgroundColor: '#0F172A',
    icon: path.join(__dirname, 'build', 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      partition: 'vcm-desktop',
      spellcheck: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    if (mainWindow && !mainWindow.isDestroyed()) mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  mainWindow.loadURL(`${localOrigin}/`);
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    const server = createServer();
    server.on('error', (err) => {
      console.error(`[desktop] local server failed: ${err.message}`);
      app.quit();
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      localOrigin = `http://127.0.0.1:${port}`;
      console.log(`[desktop] serving CRM on ${localOrigin} (API -> ${TARGET_ORIGIN})`);
      createWindow();
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && localOrigin) createWindow();
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });
}
