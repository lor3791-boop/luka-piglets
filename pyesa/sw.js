// 폐사 입력 앱 서비스워커: 공유받은 사진을 잠시 보관하고 앱 화면으로 넘김 + 화면 파일 캐시
const SHELL = 'pyesa-shell-v6';
const SHARE = 'pyesa-share';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './heic2any.min.js'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(SHELL).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pyesa-shell-') && k !== SHELL).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 다른 앱에서 '공유' → 사진을 캐시에 넣고 앱 화면으로 이동
  if (e.request.method === 'POST' && url.pathname.endsWith('/share-target')) {
    e.respondWith((async () => {
      const stamp = Date.now();
      try {
        const form = await e.request.formData();
        // 공유 앱마다 필드 이름이 다를 수 있어 파일은 전부 받음
        const files = [];
        for (const [, v] of form.entries()) if (v && typeof v === 'object' && v.size) files.push(v);
        const cache = await caches.open(SHARE);
        await Promise.all(files.map((f, i) =>
          cache.put(`./shared/${stamp}-${i}`, new Response(f, { headers: {
            'Content-Type': f.type || 'application/octet-stream',
            'X-File-Name': encodeURIComponent(f.name || ''),
          } }))
        ));
        return Response.redirect('./?shared=' + stamp, 303);
      } catch (err) {
        return Response.redirect('./?shareerr=' + encodeURIComponent(String(err && err.message || err).slice(0, 100)), 303);
      }
    })());
    return;
  }

  // 앱 화면 파일: 네트워크 우선, 안 되면 캐시 (현장에서 신호가 약해도 열리게)
  if (e.request.method === 'GET' && url.origin === location.origin) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res.ok && url.pathname.includes('/pyesa/')) {
            const copy = res.clone();
            caches.open(SHELL).then(c => c.put(e.request, copy));
          }
          return res;
        })
        .catch(() => caches.match(e.request, { ignoreSearch: true }).then(r => r || caches.match('./index.html')))
    );
  }
});
