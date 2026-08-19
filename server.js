// 静态服务器（解决 .jsx / .js / .css MIME + 支持 /dist/ 路径）
// 可选反向代理：当 PB_URL 设置时，把 /api/* 与 /_/* 转发到后端
// （用于统一镜像：前端 + PB 共用一个容器、一个 PORT）
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const PORT = process.env.PORT ? Number(process.env.PORT) : 8123;
const PB_URL = process.env.PB_URL || '';     // e.g. http://127.0.0.1:8090
const PROXY_PATHS = ['/api/', '/_/'];          // 转发白名单前缀

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.jsx':  'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
};

// 反向代理：转发到 PB_URL（含 WebSocket upgrade）
function proxyToPB(req, res) {
  const u = new URL(PB_URL);
  const opts = {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: req.headers,
  };
  const proxyReq = http.request(opts);
  proxyReq.on('response', (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('upgrade', (proxyRes, socket, head) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    if (typeof res.flushHeaders === 'function') res.flushHeaders();
    socket.pipe(res).pipe(socket);
    if (head && head.length) res.write(head);
  });
  proxyReq.on('error', (e) => {
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Backend unavailable: ' + e.message);
    }
  });
  req.on('error', () => proxyReq.destroy());
  req.pipe(proxyReq);
}

const server = http.createServer((req, res) => {
  const urlPath = decodeURIComponent(req.url.split('?')[0]);

  // 反向代理路由
  if (PB_URL && PROXY_PATHS.some((p) => urlPath === p.replace(/\/$/, '') || urlPath.startsWith(p))) {
    return proxyToPB(req, res);
  }

  // 静态文件
  let filePath = urlPath === '/' ? '/index.html' : urlPath;
  filePath = path.normalize(path.join(ROOT, filePath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); return res.end('forbidden'); }

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      return res.end('Not found: ' + urlPath);
    }
    const ext = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  if (PB_URL) {
    console.log(`static server: http://localhost:${PORT}/  (proxying ${PROXY_PATHS.join(', ')} -> ${PB_URL})`);
  } else {
    console.log(`react server: http://localhost:${PORT}/`);
  }
});
