(function () {
  var CACHE = 'WoLaiZhangShaoV1_';
  try {
    localStorage.setItem(CACHE + 'unLockAllTime', String(Date.now()));
    localStorage.setItem(CACHE + 'allUnLockHour', '999999');
  } catch (e) {}

  // 196 关 = 之前两批 120 关（A 60 + B 60）+ 新验 76 关（80 关去掉 14/45/51/71 四个超时的）
  // 三组之间零重叠（2026-11-11 集合核对：b60∩b60b=空、旧120∩新76=空）
  var POOL_DEFAULT = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 20, 24, 27, 28, 31, 32, 36, 37, 38, 39, 40, 41, 42, 43, 44, 46, 47, 48, 49, 50,
    52, 53, 54, 55, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86, 87, 88, 89,
    90, 91, 92, 93, 94, 95, 96, 97, 98, 99, 100, 101, 102, 103, 104, 105, 106, 107, 108, 109, 110, 111, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122,
    126, 131, 132, 136, 141, 145, 147, 152, 157, 160, 163, 168, 173, 177, 179, 184, 188, 190, 191, 194, 197, 202, 207, 208, 212, 216, 218, 222, 224, 229, 230, 235, 236,
    241, 246, 248, 252, 257, 261, 263, 268, 270, 271, 272, 276, 281, 286, 287, 292, 296, 300, 302, 307, 312, 313, 318, 323, 324, 326, 327, 330, 332, 337,
    338, 339, 340, 341, 342, 343, 344, 345, 346, 347, 348, 349, 350, 351, 352, 353, 354, 355, 356, 357, 358, 359, 360, 361, 362, 363, 364, 365, 366, 367
  ];
  var POOL = POOL_DEFAULT.slice();
  try {
    var q = new URLSearchParams(location.search).get('levels');
    if (q) {
      var t = q.split(',').map(function (x) { return parseInt(x, 10); }).filter(function (x) { return x > 0; });
      if (t.length) POOL = t;
    }
  } catch (e) {}
  var HIST_KEY = 'zlzsDemoHistory_' + POOL.join('_');

  // 工具与加时已拆到 -add.js / -util.js，这里取引用（index 里需先加载那两个文件）
  var shuffle = window.__zlzsUtil.shuffle;
  var newQueue = window.__zlzsUtil.newQueue;
  var loadHistory = window.__zlzsUtil.loadHistory;
  var saveHistory = window.__zlzsUtil.saveHistory;
  var mcc = window.__zlzsUtil.mcc;
  var cleanShells = window.__zlzsUtil.cleanShells;
  var closeSignIn = window.__zlzsUtil.closeSignIn;
  var pressAddTime = window.__zlzsAdd.pressAddTime;
  var timeLeftSec = window.__zlzsAdd.timeLeftSec;
  var planAddTime = window.__zlzsAdd.planAddTime;
  var clickAddTimeBtn = window.__zlzsAdd.clickAddTimeBtn;
  var humanGap = window.__zlzsAdd.humanGap;
  var preloadNext = window.__zlzsAdd.preloadNext;
  // 加时计划对象在 add.js 的私有作用域里，只挂了 window.__zlzsAddPlan；
  // 拆分后这里必须取引用，否则一进 play 就 ReferenceError，整个 loop 停摆（2026-11-11 定位）
  var addPlan = window.__zlzsAddPlan;

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

  var FLOW_H = { humanGap: humanGap, newQueue: newQueue, saveHistory: saveHistory, HIST_KEY: HIST_KEY, planAddTime: planAddTime, preloadNext: preloadNext };
  var STALL_MS = 30000;      // 30 秒没有任何进度变化 = 卡死（2026-11-11 远山定：直接换下一关，绝不重进本关）
  // 2026-11-11 远山定：不设单关时长上限。慢关打 3 分钟还是 30 分钟都不斜，只看真实通关；
  // 判死只有两条：驱动停转（dead）、120 秒零进度（stalled）。没有 tooLong / HARD_MS。
  // 2026-11-10 远山定：卡关不重进，直接换下一关（原 MAX_RETRY 重试机制已移除）

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
      DEMO.loadStartAt = Date.now();
      setTimeout(loop, 1500);
      return;
    }

    if (DEMO.state === 'loading') { window.__zlzsFlow.loading(DEMO, m, loop, FLOW_H); return; }

    if (DEMO.state === 'play') {
      // 剩余时间掉到随机触发点以下 → 主动加时（远山要求：50~10 秒之间随机，不许固定）
      var leftNow = timeLeftSec();
      if (leftNow != null && !addPlan.done && leftNow <= addPlan.at && addPlan.times < addPlan.maxTimes) {
        addPlan.tries = (addPlan.tries || 0) + 1;
        if (clickAddTimeBtn(m)) {
          addPlan.done = 1;
          addPlan.times++;
          var afterLeft = timeLeftSec();
          DEMO.log.push('addtime@plan' + addPlan.at.toFixed(1) + ' left' + leftNow + '→' + afterLeft + ' (' + addPlan.times + '/' + addPlan.maxTimes + ')');
          if (DEMO.log.length > 1500) DEMO.log.splice(0, DEMO.log.length - 1500);
          if (addPlan.times < addPlan.maxTimes) {
            setTimeout(function () { planAddTime(true); }, 1500);   // 再摇一个新窗口（次数不清零）
          }
          setTimeout(loop, 300);
          return;
        }
        if (addPlan.tries >= 5) {                 // 点不动 5 次就放弃本关，避免每拍狂点
          addPlan.done = 1;
          DEMO.log.push('addtime-giveup left' + leftNow);
        }
      }
      var A = window.__zlzsAuto;
      if (!A) { setTimeout(loop, 500); return; }
      var st = {};
      try { st = JSON.parse(A.status()); } catch (e) {}
      // 胜利面板 / 卡死 / 开关节拍 三道判定都在 flow 里，返回 true 表示这一拍已处理
      if (window.__zlzsFlow.playGuard(DEMO, m, loop, A, st, STALL_MS)) return;
      setTimeout(loop, 800);
      return;
    }

    if (DEMO.state === 'win') { window.__zlzsFlow.win(DEMO, m, loop, FLOW_H); return; }

    if (DEMO.state === 'next') { window.__zlzsFlow.next(DEMO, m, loop, FLOW_H); return; }

    // 无限循环：不再有 done 终态
    setTimeout(loop, 1000);
  }

  // OSS 直连：不需要 Service Worker 跨仓转发（__ZLZS_NO_SW = true），直接开跑
  DEMO.sw = 'oss-direct';
  setTimeout(loop, 600);
})();
