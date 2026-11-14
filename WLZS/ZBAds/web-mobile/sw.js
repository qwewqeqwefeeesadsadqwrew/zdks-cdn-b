/* sw.js —— 我来掌勺（WLZS 196 关版）运行时缓存
 * 照《变个花样玩》的 sw.js（2026-11-15 黛西迁移）：
 *   - 第一次打开：用到哪下到哪，边玩边缓存
 *   - 之后：静态资源命中本地缓存，进关不用重新下
 *   - 入口页 / 驱动 / boot 永远走网络（否则改版推不出去）
 *
 * 部署位置：与 index-b120.html 同目录（GitHub Pages 的 WLZS/ZBAds/web-mobile/）
 * 资源实际从阿里云 OSS 加载（<base href>），跨域 opaque 响应也缓存。
 */
var CACHE = 'wlzs-rt-v1';

// 永远走网络：入口页、SW 自己、所有 zlzs-* 驱动/boot 脚本（改版必须能被用户拿到）
var ALWAYS_NETWORK = /(?:^|\/)(?:index[^/]*\.html|sw\.js|[^/]*zlzs-[^/]*\.js)$/;

// 可缓存类型（关卡资源是 png / mp3 / json / js）
var CACHEABLE = /\.(js|mjs|json|css|png|jpe?g|webp|gif|mp3|ogg|wav|mp4|cconb|wasm|bin|ttf|otf|woff2?|atlas|plist)$/i;

function keyOf(url) {
  var u = new URL(url);
  u.search = '';
  u.hash = '';
  return u.href;
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (e) {
  var req = e.request;
  if (req.method !== 'GET') return;
  var url = new URL(req.url);
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // 入口页 / SW / 驱动：永远走网络，不缓存
  if (ALWAYS_NETWORK.test(url.pathname)) {
    e.respondWith(fetch(req).catch(function () { return caches.match(req); }));
    return;
  }

  // 其余静态资源：缓存优先，未命中再下载并写缓存
  if (!CACHEABLE.test(url.pathname)) return;

  var key = keyOf(req.url);
  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(key).then(function (hit) {
        if (hit) return hit;
        return fetch(req).then(function (res) {
          if (res && (res.status === 200 || res.type === 'opaque')) {
            var clone = res.clone();
            cache.put(key, clone).catch(function () {});
          }
          return res;
        });
      });
    })
  );
});
