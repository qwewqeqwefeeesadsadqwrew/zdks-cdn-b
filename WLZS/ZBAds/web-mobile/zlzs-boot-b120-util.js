// zlzs-boot-b120-util.js — 洗牌 / 历史 / 游戏对象访问（从 boot 拆出）
// 依赖 window.__zlzsDemo；函数挂到 window.__zlzsUtil
(function () {

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

  // ---- 卡死看护：卡住就直接换下一关，绝不重进本关（远山 2026-11-10 定）----
  // 判据用「进度心跳」而不是总时长：只要画面段/步骤/状态还在变，说明真在打，不打断。

  window.__zlzsUtil = {
    shuffle: shuffle, newQueue: newQueue,
    loadHistory: loadHistory, saveHistory: saveHistory,
    mcc: mcc, cleanShells: cleanShells, closeSignIn: closeSignIn,
  };
})();