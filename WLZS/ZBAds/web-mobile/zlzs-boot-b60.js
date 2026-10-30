// zlzs-boot-b60.js — 我来掌勺演示站·**60 关整池**引导：解锁预置 / 资源根指向本站 / 洗牌式无限循环
// 说明：不改游戏文件；解锁用游戏自己的存档键，资源根覆盖运行时 getter，玩法全部走游戏自身判定
// 循环规则：每一轮把 60 关洗牌（Fisher-Yates，轮内不重复），排列历史去重（轮间不重复、刷新保持）；
// 新一轮第一关不与上一轮最后一关相同；URL 可用 ?levels=1,354,... 指定测试池
(function () {
  var CACHE = 'WoLaiZhangShaoV1_';
  try {
    localStorage.setItem(CACHE + 'unLockAllTime', String(Date.now()));
    localStorage.setItem(CACHE + 'allUnLockHour', '999999');
  } catch (e) {}

  function shuffle(a) {
    var r = a.slice();
    for (var i = r.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = r[i]; r[i] = r[j]; r[j] = t;
    }
    return r;
  }
  // 新的一轮：洗牌式——① 每轮是本池的一个排列（轮内不重复）；
  // ② 新一轮的排列不得出现在历史中（轮与轮不重复）；③ 首关不与上一轮末关相同。
  // 120 种排列用尽后清空历史从头来（实际演示跑不到）。
  function newQueue(pool, prevLast, history) {
    var n = 1;
    for (var f = 2; f <= pool.length; f++) n *= f;
    for (var tries = 0; tries < 500; tries++) {
      var q = shuffle(pool);
      if (q.length > 1 && prevLast != null && q[0] === prevLast) continue;
      if (history && history.indexOf(q.join(',')) >= 0) {
        if (history.length >= n) history.length = 0;
        continue;
      }
      return q;
    }
    // 兜底：清历史后再洗一次
    if (history) history.length = 0;
    return shuffle(pool);
  }

  function loadHistory(key) {
    try { var h = JSON.parse(localStorage.getItem(key) || '[]'); return Array.isArray(h) ? h : []; } catch (e) { return []; }
  }
  function saveHistory(key, h) {
    try { localStorage.setItem(key, JSON.stringify(h)); } catch (e) {}
  }

  // 60 关整池：三批合并，零重叠（第一批 20 + 第二批 20 + 第三批 20）
  var POOL_B1 = [1, 354, 271, 347, 53, 191, 367, 324, 188, 230, 346, 270, 366, 365, 364, 363, 362, 361, 360, 359];
  var POOL_B2 = [358, 357, 356, 355, 327, 353, 352, 351, 350, 349, 348, 272, 330, 345, 344, 343, 342, 341, 340, 339];
  var POOL_B3 = [338, 326, 313, 300, 287, 216, 261, 248, 235, 222, 208, 194, 177, 160, 145, 131, 118, 102, 90, 67];
  var DEFAULT_POOL = POOL_B1.concat(POOL_B2, POOL_B3);
  var POOL = DEFAULT_POOL.slice();
  try {
    var q = new URLSearchParams(location.search).get('levels');
    if (q) {
      var t = q.split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; });
      if (t.length) POOL = t;
    }
  } catch (e) {}
  var HIST_KEY = 'zlzsDemoHistory_' + POOL.join('_');

  var DEMO = {
    pool: POOL,
    queue: [],
    qi: 0,
    round: 1,
    history: loadHistory(HIST_KEY),
    histKey: HIST_KEY,
    lastFinished: null,
    state: 'boot',
    log: [],
    stopped: false,
    t0: 0,
    stop: function () { DEMO.stopped = true; },
    start: function () {
      DEMO.stopped = false;
      DEMO.state = 'boot';
      DEMO.round = 1;
      DEMO.qi = 0;
      DEMO.lastFinished = null;
      DEMO.failed = [];
      DEMO.history = loadHistory(HIST_KEY);
      DEMO.queue = newQueue(DEMO.pool, null, DEMO.history);
      DEMO.history.push(DEMO.queue.join(','));
      saveHistory(HIST_KEY, DEMO.history);
      setTimeout(loop, 400);
    },
    status: function () {
      return JSON.stringify({
        state: DEMO.state, round: DEMO.round, qi: DEMO.qi, sw: DEMO.sw || 'pending', poolSize: DEMO.pool.length,
        queue: DEMO.queue, level: DEMO.queue[DEMO.qi] || null, seenOrders: DEMO.history.length,
        failed: DEMO.failed || [],
        log: DEMO.log.slice(-25)
      });
    }
  };
  DEMO.queue = newQueue(DEMO.pool, null, DEMO.history);
  DEMO.history.push(DEMO.queue.join(','));
  saveHistory(HIST_KEY, DEMO.history);
  window.__zlzsDemo = DEMO;

  function mcc() {
    try { return window.__require ? window.__require('mCore').mcc : null; } catch (e) { return null; }
  }
  function cleanShells() {
    var c = cc.find('Canvas');
    if (!c) return;
    for (var i = c.children.length - 1; i >= 0; i--) {
      if (c.children[i].name === 'StalkPre_1') {
        try { c.children[i].destroy(); } catch (e) {}
      }
    }
  }
  function closeSignIn(m) {
    try {
      var ui = m.UI.GetUI(m.enum_ui.SignIn);
      if (ui) {
        if (ui.closeThis) { ui.closeThis(); return; }
        if (ui.hideBack && ui.hideAni) { ui.hideBack(); ui.hideAni(); ui.isOpen = false; return; }
      }
    } catch (e) {}
    try {
      var tips = cc.find('Canvas/tipsUIs');
      if (!tips) return;
      for (var i = 0; i < tips.children.length; i++) {
        var n = tips.children[i];
        if (n.name !== 'UI_SignIn' || !n.activeInHierarchy) continue;
        var comps = n._components || [], comp = null;
        for (var j = 0; j < comps.length; j++) if (comps[j].closeBtn) { comp = comps[j]; break; }
        if (comp && comp.closeBtn) { comp.closeBtn.emit('click'); }
        else { n.active = false; }
        return;
      }
    } catch (e2) {}
  }

  // 倒计时到点会弹 UI_AddTime（加时广告弹窗）；h5_noAds 下广告即时空放，点游戏自己的加时按钮继续
  function pressAddTime(m) {
    try {
      var ui = m.UI.GetUI(m.enum_ui.AddTime);
      if (ui) {
        var btn = ui.addTimeBtn || ui.addTime;
        if (btn && btn.node) { btn.node.emit('click'); DEMO.log.push('addtime'); return true; }
      }
    } catch (e) {}
    try {
      var found = null;
      (function walk(n) {
        if (!n || found) return;
        if (n.name === 'UI_AddTime' && n.activeInHierarchy) { found = n; return; }
        for (var i = 0; i < n.children.length; i++) walk(n.children[i]);
      })(cc.find('Canvas'));
      if (found) {
        var comps = found._components || [];
        for (var j = 0; j < comps.length; j++) {
          if (comps[j].addTimeBtn && comps[j].addTimeBtn.node) {
            comps[j].addTimeBtn.node.emit('click');
            DEMO.log.push('addtime');
            return true;
          }
        }
      }
    } catch (e2) {}
    return false;
  }

  // 预载下一关 bundle：提前把 config/index 和资源拉进 Cocos 缓存，切关时不用现下载。
  function preloadNext() {
    try {
      var m = mcc();
      if (!m || DEMO.queue.length < 2) return;
      var L = DEMO.queue[(DEMO.qi + 1) % DEMO.queue.length];
      var name = 'bundleLv_' + L;
      var url = m.res.getBundleJsonUrl() + name;
      var ver = (m.gameConfig.BundleJson || {})[name];
      cc.assetManager.loadBundle(url, { version: ver }, function (err, bundle) {
        if (err) { DEMO.log.push('preload-err ' + name + ' ' + err); return; }
    // 必须用 preload(paths)：preloadDir 走 DIR 枚举，打包资源没有独立文件 → 必报 download failed
        var paths = [];
        try { paths = Object.keys(bundle._config.paths._map); } catch (pe) { DEMO.log.push('preload-paths-err ' + pe); }
        DEMO.log.push('preload ' + name + ' paths=' + paths.length);
        if (!paths.length) return;
        try {
          bundle.preload(paths, function (perr) {
            // 个别资源在 pack 里 / 镜像有缺口 → err 非空是常态，别当失败
            DEMO.log.push('preloaded ' + name + (perr ? ' (partial)' : ''));
          });
        } catch (e) { DEMO.log.push('preload-ex ' + e); }
      });
    } catch (e) { DEMO.log.push('preload-ex ' + e); }
  }

  // ---- 卡死看护：卡住就重进本关，重进 2 次还不行才换下一关（远山 2026-10-30 定）----
  // 判据用「进度心跳」而不是总时长：只要画面段/步骤/状态还在变，说明真在打，不打断。
  var STALL_MS = 120000;     // 120 秒没有任何进度变化 = 卡死
  var HARD_MS = 420000;      // 单关硬上限 7 分钟（一直在动但永远打不完，只防死锁）
  var MAX_RETRY = 2;         // 同一关最多重进 2 次，第 3 次卡就换关

  function loop() {
    if (DEMO.stopped) return;
    var m = mcc();
    if (!m || !m.gameData || !m.UI) { setTimeout(loop, 300); return; }
    closeSignIn(m);
    pressAddTime(m);
    // 长时间演示防止日志无限增长
    if (DEMO.log.length > 1500) DEMO.log.splice(0, DEMO.log.length - 1500);

    if (DEMO.state === 'boot') {
      var lvUI = null;
      try { lvUI = m.UI.GetUI(m.enum_ui.Level); } catch (e) {}
      if (lvUI && m.gameData.selectLevel === 0) {
        DEMO.log.push('main-ready · round ' + DEMO.round + ' order ' + DEMO.queue.join(','));
        DEMO.state = 'enter';
        setTimeout(loop, 300);
      } else {
        setTimeout(loop, 500);
      }
      return;
    }

    if (DEMO.state === 'enter') {
      var lv = DEMO.queue[DEMO.qi];
      cleanShells();
      try { m.game.enterGengLevel(lv); } catch (e) { DEMO.log.push('enter-err ' + e); }
      DEMO.log.push('enter ' + lv + ' @' + Math.round((Date.now() - (DEMO.t0 || (DEMO.t0 = Date.now()))) / 1000) + 's');
      DEMO.state = 'loading';
      setTimeout(loop, 1500);
      return;
    }

    if (DEMO.state === 'loading') {
      var shell = cc.find('Canvas/StalkPre_1');
      var pre = shell && shell.getComponent('StalkPre_1');
      if (pre && m.gameData.selectLevel === DEMO.queue[DEMO.qi]) {
        DEMO.log.push('loaded ' + DEMO.queue[DEMO.qi]);
        DEMO.state = 'play';
        DEMO.levelStartAt = Date.now();
        // 计时：游戏只在玩家第一次触摸关卡节点时才开始倒计时；自动玩不发那个事件，
        // 这里直接调游戏自己的 downStartTime()，让顶部时间正常从 04:00 开始走。
        try { if (pre.downStartTime) pre.downStartTime(); } catch (e) { DEMO.log.push('timer-err ' + e); }
        try { window.__zlzsAuto.start(); } catch (e) { DEMO.log.push('auto-err ' + e); }
        try { if (DEMO.preloadFor !== DEMO.queue[DEMO.qi]) { DEMO.preloadFor = DEMO.queue[DEMO.qi]; setTimeout(preloadNext, 3000 + Math.random() * 2000); } } catch (e) {}
      }
      setTimeout(loop, 500);
      return;
    }

    if (DEMO.state === 'play') {
      var winNow = null;
      try { winNow = m.UI.GetUI(m.enum_ui.Win); } catch (e) {}
      if (winNow) { try { window.__zlzsAuto.stop(); } catch (e) {} DEMO.retry = 0; DEMO.state = 'win'; setTimeout(loop, 200); return; }

      var A = window.__zlzsAuto;
      if (!A) { setTimeout(loop, 500); return; }
      var st = {};
      try { st = JSON.parse(A.status()); } catch (e) {}

      // 卡死判定：停转 / 进度长时间不动 / 单关超硬上限
      var sinceProg = st.lastProgressAt ? (Date.now() - st.lastProgressAt) : (Date.now() - (DEMO.levelStartAt || Date.now()));
      var dead = !st.running && st.why !== 'scene-done';
      var stalled = !!st.running && sinceProg > STALL_MS;
      var tooLong = !!DEMO.levelStartAt && (Date.now() - DEMO.levelStartAt) > HARD_MS;

      if (dead || stalled || tooLong) {
        var why = tooLong ? 'hard ' + Math.round((Date.now() - DEMO.levelStartAt) / 1000) + 's'
                : stalled ? 'stall ' + Math.round(sinceProg / 1000) + 's'
                : 'auto-end ' + (st.why || '?');
        try { window.__zlzsAuto.stop(); } catch (e) {}
        DEMO.retry = (DEMO.retry || 0) + 1;
        if (DEMO.retry <= MAX_RETRY) {
          DEMO.log.push('stall-retry ' + DEMO.queue[DEMO.qi] + ' #' + DEMO.retry + ' (' + why + ')');
          DEMO.state = 'reenter';
        } else {
          DEMO.log.push('stall-giveup ' + DEMO.queue[DEMO.qi] + ' (' + why + ') → 换下一关');
          (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
          DEMO.winWaitAt = Date.now() - 12000;   // 直接走切关，不再等胜利面板
          DEMO.state = 'win';
        }
        setTimeout(loop, 300);
        return;
      }

      if (!st.running) {
        // 只剩 scene-done 会走到这里：画面段打完了、胜利面板还没弹
        DEMO.log.push('clear ' + DEMO.queue[DEMO.qi]);
        DEMO.state = 'win';
      }
      setTimeout(loop, 800);
      return;
    }

    if (DEMO.state === 'reenter') {
      // 卡死重进：先清旧关卡壳，再重新进**同一关**（不换关）
      var sameLv = DEMO.queue[DEMO.qi];
      cleanShells();
      try { m.game.dispachEvent(m.enum_event.Remove_Level); m.UI.closeAllUI(); } catch (e) {}
      try { m.game.enterGengLevel(sameLv); } catch (e) { DEMO.log.push('reenter-err ' + e); }
      DEMO.log.push('reenter ' + sameLv + ' (第 ' + DEMO.retry + ' 次重试)');
      DEMO.preloadFor = null;        // 允许重新预载下一关
      DEMO.state = 'loading';
      setTimeout(loop, 1500);
      return;
    }

    if (DEMO.state === 'win') {
      var win = null;
      try { win = m.UI.GetUI(m.enum_ui.Win); } catch (e) {}
      if (!win) {
        // 兜底：auto-end（idle-no-tip 等）不是真胜利，胜利面板永远不弹，不能永久干等。
        // 等 12 秒还没有面板就记一次 skip，照常切下一关。验收要求 skip=0，这里只防死锁。
        if (!DEMO.winWaitAt) DEMO.winWaitAt = Date.now();
        if (Date.now() - DEMO.winWaitAt < 12000) { setTimeout(loop, 500); return; }
        (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
        DEMO.log.push('skip ' + DEMO.queue[DEMO.qi] + ' no-win-panel');
      }
      try { window.__zlzsAuto.stop(); } catch (e) {}
      if (win) {
        DEMO.lastFinished = DEMO.queue[DEMO.qi];
        DEMO.log.push('win ' + DEMO.lastFinished + ' @' + Math.round((Date.now() - (DEMO.t0 || Date.now())) / 1000) + 's');
      }
      DEMO.winWaitAt = 0;
      DEMO.qi++;
      if (DEMO.qi >= DEMO.queue.length) {
        DEMO.round++;
        DEMO.queue = newQueue(DEMO.pool, DEMO.lastFinished, DEMO.history);
        DEMO.history.push(DEMO.queue.join(','));
        saveHistory(HIST_KEY, DEMO.history);
        DEMO.qi = 0;
        DEMO.log.push('round ' + DEMO.round + ' order ' + DEMO.queue.join(','));
      }
      DEMO.state = 'next';
      DEMO.nextAt = Date.now() + 150 + Math.random() * 350;
      setTimeout(loop, 300);
      return;
    }

    if (DEMO.state === 'next') {
      if (Date.now() < DEMO.nextAt) { setTimeout(loop, 200); return; }
      var nextLv = DEMO.queue[DEMO.qi];
      DEMO.retry = 0;               // 新关重新计数重试次数
      try {
        m.game.dispachEvent(m.enum_event.Remove_Level);
        m.UI.closeAllUI();
        m.game.enterGengLevel(nextLv);
        DEMO.log.push('next ' + nextLv + ' @' + Math.round((Date.now() - (DEMO.t0 || Date.now())) / 1000) + 's');
      } catch (e) { DEMO.log.push('next-err ' + e); }
      DEMO.state = 'loading';
      setTimeout(loop, 1200);
      return;
    }

    // 无限循环：不再有 done 终态
    setTimeout(loop, 1000);
  }
  // Service Worker 必须先接管页面：60 关里只有 20 关在本仓，另 40 关的 bundle 靠 SW 转发到 zdks-l4-demo。
  // 坑（2026-10-30 实测踩到）：`navigator.serviceWorker.ready` 只代表「已经有 active worker」，
  // **不代表当前页面已被它控制**。claim() 是异步的，首次加载时 ready 常常先 resolve、controller 还是 null。
  // 所以不能拿 controller 当判据——要直接探「转发到底通不通」。
  function waitController(ms) {
    if (navigator.serviceWorker.controller) return Promise.resolve(true);
    return new Promise(function (res) {
      var settled = false;
      function finish(v) { if (settled) return; settled = true; res(v); }
      var timer = setTimeout(function () { finish(!!navigator.serviceWorker.controller); }, ms);
      var iv = setInterval(function () {
        if (navigator.serviceWorker.controller) { clearInterval(iv); clearTimeout(timer); finish(true); }
      }, 120);
      try {
        navigator.serviceWorker.addEventListener('controllerchange', function () {
          clearInterval(iv); clearTimeout(timer); finish(true);
        });
      } catch (e) {}
    });
  }
  // 真判据：拿一个「本仓没有、只能靠转发」的关卡文件探一下。200 = 转发真的通了。
  var PROBE_URLS = [
    '/zdks-cdn-b/WLZS/Bundle/assets/bundleLv_1/config.c9a7c.json',
    '/zdks-cdn-b/WLZS/Bundle/assets/bundleLv_1/index.c9a7c.js'
  ];
  function probeForward(i) {
    i = i || 0;
    if (i >= PROBE_URLS.length) return Promise.resolve(false);
    return fetch(PROBE_URLS[i], { cache: 'no-store' })
      .then(function (r) { return r.ok ? true : probeForward(i + 1); })
      .catch(function () { return probeForward(i + 1); });
  }
  function waitSW() {
    if (!('serviceWorker' in navigator)) { DEMO.sw = 'unsupported'; return Promise.resolve(false); }
    return navigator.serviceWorker.register('/zdks-cdn-b/WLZS/sw60.js', { scope: '/zdks-cdn-b/WLZS/' })
      .then(function () { return navigator.serviceWorker.ready; })
      .then(function () { return waitController(6000); })
      .then(function (hasCtrl) { DEMO.ctrl = hasCtrl; return probeForward(); })
      .then(function (ok) {
        DEMO.sw = ok ? (DEMO.ctrl ? 'ready' : 'forward-ok-claim-late') : 'forward-broken';
        return ok;
      })
      .catch(function (e) { DEMO.sw = 'failed: ' + e; return false; });
  }

  waitSW().then(function (ok) {
    if (!ok) {
      // 转发不通 → 那 40 关会 404。**只滤掉本仓加载不了的**，不要覆盖用户传的 ?levels=
      var B3SET = {};
      for (var bi = 0; bi < POOL_B3.length; bi++) B3SET[POOL_B3[bi]] = 1;
      var keep = DEMO.pool.filter(function (lv) { return B3SET[lv]; });
      DEMO.log.push('SW ' + DEMO.sw + ' → 只留本仓能加载的 ' + keep.length + '/' + DEMO.pool.length + ' 关');
      DEMO.pool = keep.length ? keep : POOL_B3.slice();
      DEMO.history = [];
      DEMO.queue = newQueue(DEMO.pool, null, DEMO.history);
      DEMO.history.push(DEMO.queue.join(','));
    }
    setTimeout(loop, 600);
  });
})();
