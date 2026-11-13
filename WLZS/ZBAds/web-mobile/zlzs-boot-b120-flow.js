// zlzs-boot-b120-flow.js —— loading / win / next 三个状态（从 boot 拆出，控制单文件行数）
// 依赖：window.__zlzsDemo（状态，boot 创建）、window.__zlzsAuto（内核）、window.__require（引擎）
// helper 由 boot 传进来：H = { humanGap, newQueue, saveHistory, HIST_KEY, planAddTime, preloadNext }
(function () {

  function loading(DEMO, m, loop, H) {
    // 超时保护：90 秒还没进 play 就跳过关（缺图的关会永久卡在 loading）
    if (DEMO.loadStartAt && Date.now() - DEMO.loadStartAt > 90000) {
      DEMO.log.push('load-timeout ' + DEMO.queue[DEMO.qi]);
      (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
      DEMO.loadStartAt = 0;
      DEMO.qi++;
      if (DEMO.qi >= DEMO.queue.length) {
        DEMO.round++;
        DEMO.queue = H.newQueue(DEMO.pool, DEMO.lastFinished, DEMO.history);
        DEMO.history.push(DEMO.queue.join(','));   // 洗出即记（技能阶段 5 ②）：漏这句这一轮排列不进历史，轮间去重直接失效
        H.saveHistory(H.HIST_KEY, DEMO.history);
        DEMO.qi = 0;
        DEMO.log.push('round ' + DEMO.round + ' order ' + DEMO.queue.join(','));
      }
      DEMO.state = 'next';
      DEMO.nextAt = Date.now() + 800;
      setTimeout(loop, 400);
      return;
    }
    var shell = cc.find('Canvas/StalkPre_1');
    var pre = shell && shell.getComponent('StalkPre_1');
    if (pre && m.gameData.selectLevel === DEMO.queue[DEMO.qi]) {
      DEMO.log.push('loaded ' + DEMO.queue[DEMO.qi]);
      DEMO.state = 'play';
      DEMO.levelStartAt = Date.now();
      H.planAddTime();   // 本关的加时触发点（10~50 秒随机）
      // 拟人：切关加载动画期间不动手，0.5~1.5 秒后再启动内核
      var animWait = H.humanGap(900, 500, 1500);
      DEMO.autoStartingAt = Date.now() + Math.round(animWait) + 4000;   // 启动前的宽限期，别被 dead 判定误杀
      DEMO.log.push('anim-wait ' + Math.round(animWait) + 'ms');
      // 计时：游戏只在玩家第一次触摸关卡节点时才开始倒计时；自动玩不发那个事件，
      // 这里直接调游戏自己的 downStartTime()，让顶部时间正常从 04:00 开始走。
      try { if (pre.downStartTime) pre.downStartTime(); } catch (e) { DEMO.log.push('timer-err ' + e); }
      setTimeout(function () {
        DEMO.log.push('start-cb ' + (window.__zlzsAuto ? 'A-ok' : 'A-none'));   // 探针
        DEMO.autoStartingAt = 0;
        try { DEMO.log.push('start-ret ' + window.__zlzsAuto.start()); } catch (e) { DEMO.log.push('auto-err ' + e); }
      }, Math.round(animWait));
      try {
        if (DEMO.preloadFor !== DEMO.queue[DEMO.qi]) {
          DEMO.preloadFor = DEMO.queue[DEMO.qi];
          setTimeout(H.preloadNext, 3000 + Math.random() * 2000);
        }
      } catch (e) {}
    }
    setTimeout(loop, 500);
  }

  function win(DEMO, m, loop, H) {
    var w = null;
    try { w = m.UI.GetUI(m.enum_ui.Win); } catch (e) {}
    if (!w) {
      // 兜底：auto-end（idle-no-tip 等）不是真胜利，胜利面板永远不弹，不能永久干等。
      // 等 12 秒还没有面板就记一次 skip，照常切下一关。验收要求 skip=0，这里只防死锁。
      if (!DEMO.winWaitAt) DEMO.winWaitAt = Date.now();
      if (Date.now() - DEMO.winWaitAt < 12000) { setTimeout(loop, 500); return; }
      (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
      DEMO.log.push('skip ' + DEMO.queue[DEMO.qi] + ' no-win-panel');
    }
    try { window.__zlzsAuto.stop(); } catch (e) {}
    if (w) {
      if (!DEMO.winPauseAt) {
        DEMO.lastFinished = DEMO.queue[DEMO.qi];
        DEMO.log.push('win ' + DEMO.lastFinished + ' @' + Math.round((Date.now() - (DEMO.t0 || Date.now())) / 1000) + 's');
        try { console.log('[WIN] lv' + DEMO.lastFinished); } catch (e) {}
        // 拟人：先看一眼结算，不立刻切走（1~3 秒，对数正态）
        DEMO.winPauseAt = Date.now() + H.humanGap(1800, 1200, 3000);
        DEMO.log.push('win-pause ' + (Math.round((DEMO.winPauseAt - Date.now()) / 100) / 10) + 's');
      }
      if (Date.now() < DEMO.winPauseAt) { setTimeout(loop, 300); return; }
      DEMO.winPauseAt = 0;
    }
    DEMO.winWaitAt = 0;
    DEMO.qi++;
    if (DEMO.qi >= DEMO.queue.length) {
      DEMO.round++;
      DEMO.queue = H.newQueue(DEMO.pool, DEMO.lastFinished, DEMO.history);
      DEMO.history.push(DEMO.queue.join(','));
      H.saveHistory(H.HIST_KEY, DEMO.history);
      DEMO.qi = 0;
      DEMO.log.push('round ' + DEMO.round + ' order ' + DEMO.queue.join(','));
    }
    DEMO.state = 'next';
    // 拟人：普通换关 0.6~2.2 秒；跳轮（qi 归零）多歇 3~8 秒
    DEMO.nextAt = Date.now() + (DEMO.qi === 0 ? H.humanGap(5000, 3000, 8000) : H.humanGap(1200, 600, 2200));
    if (DEMO.qi === 0) DEMO.log.push('round-pause ' + (Math.round((DEMO.nextAt - Date.now()) / 100) / 10) + 's');
    setTimeout(loop, 300);
  }

  function next(DEMO, m, loop, H) {
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
    DEMO.loadStartAt = Date.now();
    setTimeout(loop, 1200);
  }

  // play 状态的判定：胜利面板 / 卡死 / 开关节拍。返回 true = 这一拍已处理，boot 直接 return
  function playGuard(DEMO, m, loop, A, st, STALL_MS) {
    // 1) 胜利面板：成功面板实名是 UI_WinGame，GetUI 拿不到，直接找节点
    var winShown = false;
    try {
      var winNow = m.UI.GetUI(m.enum_ui.Win);
      winShown = !!(winNow && winNow.node && winNow.node.activeInHierarchy);
    } catch (e) {}
    if (!winShown) {
      try {
        var hit = null;
        (function walk(n) {
          if (!n || hit) return;
          if ((n.name === 'UI_WinGame' || n.name === 'nextBtn') && n.activeInHierarchy) { hit = n; return; }
          for (var i = 0; i < n.children.length; i++) walk(n.children[i]);
        })(cc.find('Canvas'));
        if (hit) { winShown = true; DEMO.log.push('win-node ' + hit.name); }
      } catch (e) {}
    }
    if (winShown) {
      try { A.stop(); } catch (e) {}
      DEMO.retry = 0;
      DEMO.state = 'win';
      setTimeout(loop, 200);
      return true;
    }

    // 2) 卡死：驱动停转（dead）/ 120 秒零进度（stalled）。没有单关时长上限。
    var sinceProg = st.lastProgressAt ? (Date.now() - st.lastProgressAt) : (Date.now() - (DEMO.levelStartAt || Date.now()));
    var dead = !st.running && st.why !== 'scene-done' && !(DEMO.autoStartingAt && Date.now() < DEMO.autoStartingAt);
    var stalled = !!st.running && sinceProg > STALL_MS;
    if (dead || stalled) {
      var why = stalled ? 'stall ' + Math.round(sinceProg / 1000) + 's' : 'auto-end ' + (st.why || '?');
      try { A.stop(); } catch (e) {}
      // 卡关必须换下一关，绝对不重进同一关：重进会让观众把同一关的开头再看一遍
      DEMO.retry = 0;
      DEMO.log.push('stall-giveup ' + DEMO.queue[DEMO.qi] + ' (' + why + ') → 换下一关');
      (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
      DEMO.winWaitAt = Date.now() - 12000;   // 直接走切关，不再等胜利面板
      try { console.log('[WIN-SRC] stall-giveup lv' + DEMO.queue[DEMO.qi]); } catch (e) {}
      DEMO.state = 'win';
      setTimeout(loop, 300);
      return true;
    }

    // 3) 开关节拍：宽限期内 running 必然还是 false（start 还没调），绝不能当「内核自己停了」切关
    if (!st.running && !(DEMO.autoStartingAt && Date.now() < DEMO.autoStartingAt)) {
      // 只有 scene-done（画面段真的超过总数）才算打完；其他停转绝不能当赢
      if (st.why === 'scene-done') {
        DEMO.log.push('clear ' + DEMO.queue[DEMO.qi]);
        try { console.log('[WIN-SRC] scene-done lv' + DEMO.queue[DEMO.qi]); } catch (e) {}
        DEMO.state = 'win';
      } else {
        DEMO.log.push('auto-stop ' + DEMO.queue[DEMO.qi] + ' (' + (st.why || '?') + ') → 换下一关');
        try { console.log('[WIN-SRC] auto-stop lv' + DEMO.queue[DEMO.qi] + ' why=' + (st.why || '?')); } catch (e) {}
        (DEMO.failed = DEMO.failed || []).push(DEMO.queue[DEMO.qi]);
        DEMO.winWaitAt = Date.now() - 12000;
        DEMO.state = 'win';
      }
      setTimeout(loop, 800);
      return true;
    }
    return false;
  }

  window.__zlzsFlow = { loading: loading, win: win, next: next, playGuard: playGuard };
})();
