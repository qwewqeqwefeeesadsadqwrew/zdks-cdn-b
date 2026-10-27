// 演示站 Service Worker：首次加载后全量缓存，二次打开秒开
// ⚠ 不要用 cache.match(req, {ignoreSearch:true})：Chrome 对每一条缓存做线性扫描，
//    几千条缓存 × 几百个请求会把主线程拖死（实测页面卡死数分钟）。按「去掉 query 的完整 URL」精确匹配。
const CACHE = 'zdks-cdn-b-b3-v2';
const ALWAYS_NETWORK = /(?:index[^/]*\.html|game[^/]*\.html|precache\.(?:js|json)|sw\.js|[^/]*(?:boot|autoplay)[^/]*\.js)$/;
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const key = e.request.url.split('#')[0].split('?')[0];
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(key);
    // 入口 / boot / autoplay：network-first，拿最新；网络慢（2.5s）或断网时退回缓存，防白屏
    if (ALWAYS_NETWORK.test(key)) {
      try {
        const net = await Promise.race([
          fetch(e.request),
          new Promise((_, rej) => setTimeout(() => rej(new Error('sw-timeout')), 2500))
        ]);
        if (net && net.ok) { try { cache.put(key, net.clone()); } catch (_) {} }
        return net;
      } catch (err) {
        if (hit) return hit;
        return Response.error();
      }
    }
    if (hit) return hit;
    try {
      const res = await fetch(e.request);
      if (res && res.ok) cache.put(key, res.clone());
      return res;
    } catch (err) {
      return Response.error();
    }
  })());
});
