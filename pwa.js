/* PWA共通スクリプト: Service Worker登録 + 手袋モード（localStorageで全ページ共通） */
(function () {
  'use strict';

  // Service Worker 登録
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('./sw.js').catch(function (err) {
        if (window.console) { console.warn('SW registration failed:', err); }
      });
    });
  }

  // 手袋モード
  var KEY = 'denki-glove-mode';
  function isOn() {
    try { return window.localStorage.getItem(KEY) === '1'; } catch (e) { return false; }
  }
  function apply(on) {
    document.body.classList.toggle('glove', on);
    var btn = document.getElementById('gloveToggle');
    if (btn) {
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.textContent = on ? '🧤 手袋モード: ON' : '🧤 手袋モード: OFF';
    }
  }
  function init() {
    apply(isOn());
    var btn = document.getElementById('gloveToggle');
    if (btn) {
      btn.addEventListener('click', function () {
        var next = !document.body.classList.contains('glove');
        try { window.localStorage.setItem(KEY, next ? '1' : '0'); } catch (e) { /* 保存できなくても切替は行う */ }
        apply(next);
      });
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
