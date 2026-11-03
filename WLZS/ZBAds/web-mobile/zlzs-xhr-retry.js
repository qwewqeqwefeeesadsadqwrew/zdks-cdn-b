// zlzs-xhr-retry.js —— XHR 超时自动重试（修 GitHub Pages 偶发请求永久挂起）
// 现象：Cocos 资源加载的最后几个 XHR 发出去后永不返回，进度条卡 100%，游戏不往下走。
//      服务端同一 URL 用 curl 拉 0.9~10s 能拿到，说明是浏览器连接层面的挂起，不是文件问题。
// 做法：给每个 XHR 加超时；超时后用同样的 method/url 重新发（保留调用方挂的 onload/onerror 等）。
// 只对 GET 生效（POST 不能随便重发）。
(function () {
  'use strict';
  if (window.__zlzsXhrRetry) return;
  window.__zlzsXhrRetry = { patched: 0, retried: 0, maxRetry: 4, timeoutMs: 20000 };

  var XO = XMLHttpRequest.prototype.open;
  var XS = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url) {
    this.__zlzsM = method;
    this.__zlzsU = url;
    return XO.apply(this, arguments);
  };

  XMLHttpRequest.prototype.send = function (body) {
    var xhr = this;
    var args = arguments;

    // 只处理 GET，且调用方没设超时（或者设得过大）时，给个上限
    var isGet = String(xhr.__zlzsM || 'GET').toUpperCase() === 'GET';
    if (isGet && (!xhr.timeout || xhr.timeout > window.__zlzsXhrRetry.timeoutMs)) {
      xhr.timeout = window.__zlzsXhrRetry.timeoutMs;
    }

    if (isGet && !xhr.__zlzsRetryHooked) {
      xhr.__zlzsRetryHooked = true;
      xhr.__zlzsTry = 0;
      xhr.addEventListener('timeout', function () {
        var R = window.__zlzsXhrRetry;
        if (xhr.__zlzsTry >= R.maxRetry) return;
        xhr.__zlzsTry++;
        R.retried++;
        try {
          console.warn('[xhr-retry] 第' + xhr.__zlzsTry + '次重试: ' + String(xhr.__zlzsU).slice(-70));
        } catch (e) {}
        try {
          // 重新 open 会重置状态，但 onload/onerror/timeout 等属性仍保留在实例上
          XO.call(xhr, xhr.__zlzsM, xhr.__zlzsU, true);
          xhr.timeout = R.timeoutMs;
          XS.call(xhr, null);
          R.patched++;
          return;
        } catch (e) {
          try { console.warn('[xhr-retry] 重试失败: ' + e); } catch (e2) {}
        }
        // 重试发不出去：手动触发 error，让上层（Cocos）自己走失败分支/重试
        try {
          var ev = new Event('error');
          xhr.dispatchEvent(ev);
          if (typeof xhr.onerror === 'function') xhr.onerror(ev);
        } catch (e3) {}
      });
    }

    return XS.apply(xhr, args);
  };
})();
