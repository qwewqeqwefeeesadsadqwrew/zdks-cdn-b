// sw60.js — 《我来掌勺》60 关演示站 · Service Worker
// scope = /zdks-cdn-b/WLZS/  （同时覆盖页面目录和 Bundle 目录）
//
// 它干两件事：
//   ① 跨仓路由：本仓只放了第三批 20 关，第一二批 40 关的 bundle 改写到 zdks-l4-demo 仓库
//      （三个演示仓同属 qwewqeqwefeeesadsadqwrew.github.io，同源，所以 XHR 不受 CORS 限制）
//   ② 运行时缓存（边玩边缓存）：命中直接回，未命中 fetch 后写缓存
//      缓存 key = 去掉 query 的 URL，**精确匹配**（绝不用 ignoreSearch —— Chrome 线性扫描会拖死主线程）
//
// 不改游戏文件、不预生成清单、不做全量预缓存。

var CACHE = 'wlzs60-v1';
var REMOTE_PREFIX = '/zdks-l4-demo/wlzs';   // 第一二批 40 关所在的仓
var LOCAL_PREFIX = '/zdks-cdn-b';

// 第三批 20 关（本仓自带，原样走网络）
var B3 = {
  67: 1, 90: 1, 102: 1, 118: 1, 131: 1, 145: 1, 160: 1, 177: 1, 194: 1, 208: 1,
  216: 1, 222: 1, 235: 1, 248: 1, 261: 1, 287: 1, 300: 1, 313: 1, 326: 1, 338: 1
};

// 入口页与驱动永远走网络（否则改版推不出去）
var ALWAYS_NETWORK = /(\/index-b60\.html$|\/sw60\.js$|zlzs-autoplay-60\.js$|zlzs-boot-b60\.js$)/;

// 本仓 bundle 请求 → 实际要拉的目标地址（返回 null 表示原样）
function resolveTarget(u) {
  // 关卡包：本仓只有第三批 20 关，其余 40 关转发到 zdks-l4-demo
  var m = u.pathname.match(/^\/zdks-cdn-b\/WLZS\/Bundle\/assets\/bundleLv_(\d+)\//);
  if (m) {
    if (B3[m[1]]) return null;                                  // 本仓有 → 原样
    return u.origin + u.pathname.replace(/^\/zdks-cdn-b\//, REMOTE_PREFIX + '/');
  }
  // 关卡缩略图：本仓镜像时漏了这两张，l4-demo 有 → 一并转发（没有就照旧 404，不影响玩法）
  if (/^\/zdks-cdn-b\/WLZS\/Bundle\/levelTexture\//.test(u.pathname)) {
    return u.origin + u.pathname.replace(/^\/zdks-cdn-b\//, REMOTE_PREFIX + '/');
  }
  return null;
}

self.addEventListener('install', function (e) {
  self.skipWaiting();
});

self.addEventListener('activate', function (e) {
  e.waitUntil((async function () {
    try {
      var keys = await caches.keys();
      for (var i = 0; i < keys.length; i++) {
        // 只清本 SW 的旧版本，不碰同域其它站的缓存
        if (keys[i].indexOf('wlzs60-') === 0 && keys[i] !== CACHE) await caches.delete(keys[i]);
      }
    } catch (err) {}
    // 立刻接管已打开的页面（首次加载不用刷新就能用上转发）
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', function (e) {  var req = e.request;
  if (req.method !== 'GET') return;

  var u;
  try { u = new URL(req.url); } catch (err) { return; }
  if (u.origin !== self.location.origin) return;       // 只处理同源
  if (ALWAYS_NETWORK.test(u.pathname)) return;         // 入口页/驱动永远走网络

  e.respondWith((async function () {
    var key = u.origin + u.pathname;                   // 去 query 的精确 key
    try {
      var cache = await caches.open(CACHE);
      var hit = await cache.match(key);
      if (hit) return hit;

      var target = resolveTarget(u) || req.url;
      var res = await fetch(target, { credentials: 'same-origin' });
      if (res && res.status === 200) {
        try { await cache.put(key, res.clone()); } catch (err) { /* 配额满就放弃缓存 */ }
      }
      return res;
    } catch (err) {
      return new Response('', { status: 504, statusText: 'sw-offline' });
    }
  })());
});

// 调试用（控制台可查：sw 的转发表和版本）
self.__sw60 = { version: CACHE, remote: REMOTE_PREFIX, resolveTarget: resolveTarget, alwaysNetwork: String(ALWAYS_NETWORK) };
