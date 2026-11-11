// 既定設定値。オプションページで変更された値は chrome.storage.sync に保存され、
// このオブジェクトの各キーを上書きする。
(function (root, factory) {
  const mod = factory();
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = mod;
  } else {
    (root.SLS = root.SLS || {}).defaults = mod;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  return {
    // Ctrl+Space は macOS の「前の入力ソースを選択」と競合するため Shift+S を既定にする
    captureKey: { code: 'KeyS', shift: true, ctrl: false, alt: false, meta: false },
    stepForwardKey: { code: 'ArrowRight', shift: false, ctrl: false, alt: false, meta: false },
    stepBackKey: { code: 'ArrowLeft', shift: false, ctrl: false, alt: false, meta: false },
    // 修飾キーなしの ←/→ はプレイヤー側のシーク操作に使われうるため、
    // 1 秒送り / 戻しは Shift 付きに割り当てて衝突を避ける
    seekForwardKey: { code: 'ArrowRight', shift: true, ctrl: false, alt: false, meta: false },
    seekBackKey: { code: 'ArrowLeft', shift: true, ctrl: false, alt: false, meta: false },
    downloadSubdir: 'singular-live',
    showButtons: true,
  };
});
