// zlzs-boot-b120-add.js — 加时 / 拟人节奏 / 预载下一关（从 boot 拆出）
// 依赖 window.__zlzsDemo；函数挂到 window.__zlzsAdd
(function () {
  // mcc 在 util.js 里，拆文件后需要在这里取引用
  var mcc = function () { return window.__zlzsUtil.mcc.apply(null, arguments); };
  function pressAddTime(m) {
    try {
      var ui = m.UI.GetUI(m.enum_ui.AddTime);
      if (ui) {
        var btn = ui.addTimeBtn || ui.addTime;
        if (btn && btn.node) { btn.node.emit('click'); window.__zlzsDemo.log.push('addtime'); return true; }
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
            window.__zlzsDemo.log.push('addtime');
            return true;
          }
        }
      }
    } catch (e2) {}
    return false;
  }

  // ---- 主动加时（2026-11-04 远山定：剩余 50~10 秒之间随机时刻加，绝对不能固定）----
  // 实测（_exp/probe-time3.js）：点关卡组件上的 addTimeBtn，时间 235s → 413s，随时可点。
  // 剩余时间从 downTimeLab（节点 TimeLab）的 "mm:ss" 文本解析。
  var addPlan = { at: 0, done: 0, times: 0, tries: 0, maxTimes: 3, lv: null };
  window.__zlzsAddPlan = addPlan;   // 调试用：控制台看当前触发点/次数

  function timeLeftSec() {
    try {
      var shell = cc.find('Canvas/StalkPre_1');
      var pre = shell && shell.getComponent('StalkPre_1');
      var lab = pre && pre.downTimeLab;
      var t = lab ? String(lab.string || '') : '';
      var mm = t.match(/^(\d{1,2}):(\d{2})$/);
      if (mm) return Number(mm[1]) * 60 + Number(mm[2]);
    } catch (e) {}
    return null;
  }

  // 摇一个新的触发点：10~50 秒之间，带小数，保证每次都不一样
  function planAddTime(keepTimes) {
    addPlan.at = 10 + Math.random() * 40;
    addPlan.done = 0;
    addPlan.tries = 0;
    if (!keepTimes) { addPlan.times = 0; }        // 只有进关时才清零，加时后重摇不清
    addPlan.lv = (window.__zlzsDemo.queue && window.__zlzsDemo.queue[window.__zlzsDemo.qi]) || null;
    window.__zlzsDemo.log.push('addtime-plan@' + addPlan.at.toFixed(1) + 's lv' + addPlan.lv + ' n' + addPlan.times);
    if (window.__zlzsDemo.log.length > 1500) window.__zlzsDemo.log.splice(0, window.__zlzsDemo.log.length - 1500);
  }

  // 真正去点加时按钮（关卡组件上的 addTimeBtn，随时可点）
  function clickAddTimeBtn(m) {
    try {
      var shell = cc.find('Canvas/StalkPre_1');
      var pre = shell && shell.getComponent('StalkPre_1');
      var btn = pre && pre.addTimeBtn;
      if (btn && btn.node && btn.node.activeInHierarchy) {
        btn.node.emit('click', btn);
        return true;
      }
    } catch (e) {}
    return false;
  }

  // ---- 拟人换关（2026-11-10 按技能补）----
  // 看结算 1~3 秒、跳轮 3~8 秒、切关动画 0.5~1.5 秒。对数正态，不是固定值。
  function hGauss2() {
    var u1 = Math.random() || 1e-9, u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
  function humanGap(med, lo, hi) {
    return Math.min(hi, Math.max(lo, Math.exp(Math.log(med) + 0.42 * hGauss2())));
  }

  // 预载下一关 bundle：提前把 config/index 和资源拉进 Cocos 缓存，切关时不用现下载。
  function preloadNext() {
    try {
      var m = mcc();
      if (!m || window.__zlzsDemo.queue.length < 2) return;
      var L = window.__zlzsDemo.queue[(window.__zlzsDemo.qi + 1) % window.__zlzsDemo.queue.length];
      var name = 'bundleLv_' + L;
      var url = m.res.getBundleJsonUrl() + name;
      var ver = (m.gameConfig.BundleJson || {})[name];
      cc.assetManager.loadBundle(url, { version: ver }, function (err, bundle) {
        if (err) { window.__zlzsDemo.log.push('preload-err ' + name + ' ' + err); return; }
    // 必须用 preload(paths)：preloadDir 走 DIR 枚举，打包资源没有独立文件 → 必报 download failed
        var paths = [];
        try { paths = Object.keys(bundle._config.paths._map); } catch (pe) { window.__zlzsDemo.log.push('preload-paths-err ' + pe); }
        window.__zlzsDemo.log.push('preload ' + name + ' paths=' + paths.length);
        if (!paths.length) return;
        try {
          bundle.preload(paths, function (perr) {
            // 个别资源在 pack 里 / 镜像有缺口 → err 非空是常态，别当失败
            window.__zlzsDemo.log.push('preloaded ' + name + (perr ? ' (partial)' : ''));
          });
        } catch (e) { window.__zlzsDemo.log.push('preload-ex ' + e); }
      });
    } catch (e) { window.__zlzsDemo.log.push('preload-ex ' + e); }
  }

  window.__zlzsAdd = {
    pressAddTime: pressAddTime, timeLeftSec: timeLeftSec,
    planAddTime: planAddTime, clickAddTimeBtn: clickAddTimeBtn,
    humanGap: humanGap, preloadNext: preloadNext,
  };
})();
