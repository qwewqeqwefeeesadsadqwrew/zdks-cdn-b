// zlzs-xhr-retry.js —— XHR 卡死自救（v2：改成"看有没有下载进度"，不再用总时长）
//
// v1 的问题（2026-11-04 实测踩到）：用 xhr.timeout = 12s 判断"挂住"，
//   但慢网下一次要下 8~10MB 的关卡图片，12 秒根本下不完 →
//   被反复 abort（控制台一片 net::ERR_ABORTED）→ 4 次重试用尽 → 彻底卡死。
//
// v2 判据：看**有没有下载进度**。
//   只要有 progress 事件（哪怕一次只来 1KB），就说明连接活着，绝不动它；
//   连续 IDLE_MS 毫秒没有任何字节进来，才判定为"挂住"，abort 后重发。
(function () {
  'use strict';
  if (window.__zlzsXhrRetry) return;

  var CFG = {
    idleMs: 25000,    // 连续这么多毫秒没有字节进来 = 挂住
    maxRetry: 3,      // 最多重发 3 次
    tickMs: 3000      // 每 3 秒检查一次
  };
  var R = window.__zlzsXhrRetry = { cfg: CFG, retried: 0, aborted: 0, alive: 0 };

  var XO = XMLHttpRequest.prototype.open;
  var XS = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__m = method;
    this.__u = url;
    this.__retry = 0;
    return XO.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function () {
    var xhr = this;
    var args = arguments;
    var isGet = String(xhr.__m || 'GET').toUpperCase() === 'GET';

    // 关键：不要用 xhr.timeout（那是"总时长"，慢网必然误杀）
    try { xhr.timeout = 0; } catch (e) {}

    if (!isGet) return XS.apply(xhr, args);

    xhr.__lastByte = Date.now();
    xhr.__hooked = false;

    function hookOnce() {
      if (xhr.__hooked) return;
      xhr.__hooked = true;
      ['progress', 'load', 'loadend', 'abort', 'error'].forEach(function (evt) {
        xhr.addEventListener(evt, function () {
          xhr.__lastByte = Date.now();
          if (evt === 'load' || evt === 'loadend') xhr.__done = true;
        });
      });
    }

    function watch() {
      if (xhr.__done) return;
      if (xhr.readyState === 4) { xhr.__done = true; return; }
      var idle = Date.now() - (xhr.__lastByte || Date.now());
      if (idle >= CFG.idleMs) {
        if (xhr.__retry >= CFG.maxRetry) {
          try { console.warn('[xhr-retry] 放弃: ' + String(xhr.__u).slice(-60)); } catch (e) {}
          return;
        }
        xhr.__retry++;
        R.retried++;
        R.aborted++;
        try {
          console.warn('[xhr-retry] ' + Math.round(idle / 1000) + 's 无数据，第' + xhr.__retry + '次重发: ' + String(xhr.__u).slice(-60));
        } catch (e) {}
        try {
          xhr.abort();
          XO.call(xhr, xhr.__m, xhr.__u, true);
          xhr.__lastByte = Date.now();
          xhr.__hooked = false;
          xhr.__done = false;
          hookOnce();
          XS.call(xhr, null);
        } catch (e) {
          try { xhr.dispatchEvent(new Event('error')); } catch (e2) {}
          return;
        }
      } else {
        R.alive++;
      }
      setTimeout(watch, CFG.tickMs);
    }

    hookOnce();
    setTimeout(watch, CFG.tickMs);
    return XS.apply(xhr, args);
  };
})();
