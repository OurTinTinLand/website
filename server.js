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
// 超管账号（与 start.sh 默认值一致；start.sh 会 export 进来）。
// 仍然注入给前端，但用途严格限定：仅 server.js 与 start.sh bootstrap 超管时使用。
// 前端不再直接用它们登录（见 admin_proxy.pb.js 改成走 secret 模式）。
const PB_ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'admin@tintin.land';
const PB_ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'tintinland2026';

// Demo admin 入口 secret：替换历史方案中"前端硬编码 superuser 密码"的漏洞。
// - 生产环境必须显式设置 PB_ADMIN_DEMO_SECRET；不设则 demoAdmin() 直接失败。
// - 仅用于"运营后台 demo 模式" —— 真实生产请关闭 demoAdmin，给运营人员走 PB 自带登录。
const PB_ADMIN_DEMO_SECRET = process.env.PB_ADMIN_DEMO_SECRET || '';

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
// 修复 #14：原版透传所有 header 导致 PB 端 host 校验、cookie domain 混乱。
// 这里显式覆盖：
//   - Host              改成 PB 后端自己的 host（PB 用 trustedProxy 检查后决定
//                        拿哪个 host 当 origin，否则会跟外部域名不一致）
//   - X-Forwarded-For   追加（不要覆盖）真实客户端 IP
//   - X-Forwarded-Proto 透传原 scheme（https / http）
//   - X-Forwarded-Host  透传外部域名（PB 用来判断 CORS / cookie domain）
//   - 其他 hop-by-hop 头（connection / upgrade）由 http.request 自动处理
function proxyToPB(req, res) {
  const u = new URL(PB_URL);
  // 复制一份原始 header，避免污染 req.headers
  const fwdHeaders = Object.assign({}, req.headers);
  // 覆盖 Host：让 PB 看到的是它自己的 host
  fwdHeaders.host = u.hostname + (u.port ? ':' + u.port : '');
  // X-Forwarded-For：追加（逗号分隔）
  const clientIp = (req.socket && req.socket.remoteAddress) || '';
  const xffOld = fwdHeaders['x-forwarded-for'];
  fwdHeaders['x-forwarded-for'] = xffOld ? (xffOld + ', ' + clientIp) : clientIp;
  // X-Forwarded-Proto / Host 透传外部值
  const xfp = (fwdHeaders['x-forwarded-proto'] || (req.socket && req.socket.encrypted ? 'https' : 'http'));
  fwdHeaders['x-forwarded-proto'] = xfp;
  const xfh = req.headers['host'];
  if (xfh) fwdHeaders['x-forwarded-host'] = xfh;
  // Content-Length 留给 http 自动算（不要从 req.headers 抄，可能已被消费）
  delete fwdHeaders['content-length'];
  // hop-by-hop headers 由 Node http 处理
  delete fwdHeaders['connection'];
  delete fwdHeaders['keep-alive'];
  delete fwdHeaders['transfer-encoding'];

  const opts = {
    hostname: u.hostname,
    port: u.port || (u.protocol === 'https:' ? 443 : 80),
    path: req.url,
    method: req.method,
    headers: fwdHeaders,
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
    // index.html：注入运行时配置（PB URL + 超管账号），
    // 这样前端 pb-client.js 不用硬编码密码也能拿到最新值。
    // PB_URL 只在显式设置时才覆盖（PB_URL='' 表示沿用 index.html 内联块 / pb-client.js 的默认值）
    if (filePath === path.join(ROOT, 'index.html')) {
      fs.readFile(filePath, 'utf8', (err2, html) => {
        if (err2) {
          res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
          return res.end('read error: ' + err2.message);
        }
        const lines = [];
        if (PB_URL) lines.push('window.PB_URL="' + PB_URL.replace(/"/g, '\"') + '";');
        // 注入 demo admin secret。前端用它去换 admin token；不再注入超管邮箱密码。
        if (PB_ADMIN_DEMO_SECRET) lines.push('window.PB_ADMIN_DEMO_SECRET="' + PB_ADMIN_DEMO_SECRET.replace(/"/g, '\"') + '";');
        const inject = '<script>' + lines.join('') + '</script>';
        // 插在原有 PB_URL 注入块之后、bundle.js 之前；
        // 浏览器按顺序执行：原内联块 → 超管账号 → bundle.js 加载 pb-client.js
        const injected = html.replace('<script src="dist/bundle.js"></script>', inject + '<script src="dist/bundle.js"></script>');
        res.writeHead(200, {
          'Content-Type': MIME[ext],
          'Cache-Control': 'no-store',
        });
        res.end(injected);
      });
      return;
    }
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
