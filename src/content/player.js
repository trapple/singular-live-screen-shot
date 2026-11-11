// SINGULAR LIVE (Uliza Player) 固有の DOM 知識はこのファイルにのみ置く。
// サイト側の構造が変わったときは、ここだけを直せば他のモジュールは影響を受けない。
(function () {
  'use strict';

  const SLS = (globalThis.SLS = globalThis.SLS || {});

  const SELECTORS = {
    // video.js (Uliza Player) のルート要素。position: relative を持ち、
    // フルスクリーンの対象にもなるため、追加 UI はこの配下に置く。
    // id は UlizaPlayer-upc-content-<日時>-<ハッシュ> と動的なのでクラスで引く
    container: '.ulizahtml5',
    video: '.ulizahtml5 video',
    // 下部のコントロールバー。追加ボタンの縦位置を合わせる基準にする (変更はしない)
    controlBar: '.vjs-control-bar',
  };

  // 追加 UI の挿入位置の監視範囲。document 全体を監視すると
  // 再生時刻の更新まで拾ってしまうため、プレイヤー領域に限定する
  const OBSERVE_ROOT = '.player-wrapper';

  // 再生ページの URL パターン
  // (例: /ja/play/01234567-89ab-cdef-0123-456789abcdef/fedcba98-7654-3210-fedc-ba9876543210)
  // 単に /play/ だけで判定すると紛れが増えるため、後続の UUID までを条件に含める
  const PLAY_PAGE_PATH = /\/play\/[0-9a-f]{8}-[0-9a-f-]+/i;

  // 再生ページかどうかを URL で判定する。
  // DOM の有無で判定すると、他のページと「構造が変わって要素が消えた再生ページ」を
  // 区別できず、verifySelectors による Fail Fast が意味を失うため。
  function isPlayPage() {
    return PLAY_PAGE_PATH.test(location.pathname);
  }

  function getContainer() {
    return document.querySelector(SELECTORS.container);
  }

  function getVideo() {
    return document.querySelector(SELECTORS.video);
  }

  function getControlHost() {
    return document.querySelector(SELECTORS.controlBar);
  }

  // 一時停止の判定は DOM のクラス (vjs-paused など) ではなく video 要素の状態を
  // 正とする。video.js 側のクラス名変更に影響されないようにするため。
  function isPaused() {
    const video = getVideo();
    return video ? video.paused : true;
  }

  // ファイル名に使う番組名。サイト固有の整形はここで行い、
  // format.js には汎用の禁止文字処理だけを残す。
  // SINGULAR LIVE の document.title は番組名そのもので、サイト名のサフィックスが
  // 付かない。将来付いた場合はここで落とす。
  function getTitle() {
    return document.title;
  }

  // 起動時に呼び、想定した要素が無ければ呼び出し側が警告を出す。
  // silent に動作しなくなるのを防ぐための Fail Fast。
  function verifySelectors() {
    const missing = [];
    for (const [name, selector] of Object.entries(SELECTORS)) {
      if (!document.querySelector(selector)) missing.push(`${name} (${selector})`);
    }
    return missing;
  }

  // video 要素は再生の過程で差し替えられる可能性があるため、
  // 個別の要素ではなく document で capture して拾う。
  function onPauseStateChange(callback) {
    const handler = (event) => {
      const target = event.target;
      if (target && target.tagName === 'VIDEO') callback(target.paused);
    };
    document.addEventListener('play', handler, true);
    document.addEventListener('pause', handler, true);
  }

  // プレイヤー要素そのものの生成・差し替えを検知する。
  // 一時停止しているかどうかの判定には使わない (それは isPaused の責務)。
  function onControlHostChange(callback) {
    const root = document.querySelector(OBSERVE_ROOT) || document.body;
    const observer = new MutationObserver(() => {
      callback(getControlHost());
    });
    observer.observe(root, { childList: true, subtree: true });
    return observer;
  }

  SLS.player = {
    SELECTORS,
    isPlayPage,
    getContainer,
    getVideo,
    getControlHost,
    isPaused,
    getTitle,
    verifySelectors,
    onPauseStateChange,
    onControlHostChange,
  };
})();
