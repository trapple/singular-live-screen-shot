// 追加 UI (トースト / ボタンバー) の描画。
// singular-live 既存の要素には append しかせず、属性・スタイル・クラスは書き換えない。
(function () {
  'use strict';

  const SLS = (globalThis.SLS = globalThis.SLS || {});

  // OS の判定はここで一度だけ行う。format.js は純粋関数だけを持つ約束なので、
  // navigator を読むのはブラウザでしか動かない側の責務。
  const META_LABEL = SLS.format.metaLabelForPlatform(
    (navigator.userAgentData && navigator.userAgentData.platform) || navigator.platform
  );

  const STYLE_ID = 'sls-style';
  const TOAST_DURATION_MS = 2000;

  // セレクタは全て sls- プレフィックス配下に限定し、singular-live 側と衝突させない
  const STYLE_TEXT = `
.sls-toast {
  position: fixed;
  right: 24px;
  bottom: 80px;
  z-index: 2147483647;
  max-width: 60vw;
  padding: 8px 14px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 13px;
  line-height: 1.5;
  /* mac 系のフォントだけを並べると Windows で全て外れて素の sans-serif に落ちるため、
     両 OS の UI フォントと日本語フォントを順に並べる */
  font-family: system-ui, -apple-system, "Segoe UI", "Hiragino Sans", "Yu Gothic UI", Meiryo, sans-serif;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;
}
.sls-toast.sls-visible { opacity: 1; }
.sls-toast.sls-error { background: rgba(178, 34, 34, 0.92); }

.sls-bar {
  position: absolute;
  left: 50%;
  /* 下部のコントロールバー (.vjs-control-bar, 高さ 48px) のすぐ上に置く。
     重ねると既存の再生ボタンやシークバーを隠してしまう */
  bottom: 64px;
  transform: translateX(-50%);
  /* Uliza のオーバーレイ (.uliza-overlay-button-area など) が z-index 5 で
     プレイヤー全面を覆っている。その下にあるとクリックが吸われるため上に出す */
  z-index: 1000;
  display: flex;
  gap: 16px;
  align-items: center;
  padding: 6px 10px;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.45);
}
.sls-bar.sls-hidden { display: none; }
.sls-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: #fff;
  cursor: pointer;
  transition: background 0.12s ease;
}
.sls-btn:hover { background: rgba(255, 255, 255, 0.18); }
.sls-btn:active { background: rgba(255, 255, 255, 0.3); }
.sls-btn svg { width: 26px; height: 26px; fill: currentColor; pointer-events: none; }
`;

  let toastTimer = null;

  function injectStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = STYLE_TEXT;
    document.head.appendChild(style);
  }

  // トーストは #player-con の子として置く。フルスクリーン時は
  // フルスクリーン要素のサブツリー内にないと表示されないため。
  function getToastHost() {
    return SLS.player.getContainer() || document.body;
  }

  function showToast(message, isError) {
    injectStyles();
    const host = getToastHost();
    let toast = host.querySelector(':scope > .sls-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.className = 'sls-toast';
      host.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.toggle('sls-error', Boolean(isError));
    // 連続表示でもトランジションが効くよう、一度 reflow させる
    void toast.offsetWidth;
    toast.classList.add('sls-visible');

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toast.classList.remove('sls-visible');
    }, TOAST_DURATION_MS);
  }

  // アイコンはインライン SVG で描く。絵文字はフォント依存でサイズとベースラインが
  // 環境ごとにずれ、既存ボタンと並べたときに揃わないため使わない。
  // コマ送りは「棒 + 三角」、1 秒送りは「三角 2 つ」で描き分ける。
  // 粒度の違いが一目で分かるよう、形そのものを変えている。
  const ICONS = {
    seekBack:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 5v14l-9.5-7z"/><path d="M11.5 5v14L2 12z"/></svg>',
    stepBack:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 5h2.2v14H6z"/><path d="M20 5v14L9.2 12z"/></svg>',
    shoot:
      '<svg viewBox="0 0 24 24" aria-hidden="true" fill-rule="evenodd">' +
      '<path d="M20 5h-3.2l-1.4-2H8.6L7.2 5H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2zm-8 14a5 5 0 1 1 0-10 5 5 0 0 1 0 10z"/></svg>',
    stepForward:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15.8 5H18v14h-2.2z"/><path d="M4 5v14l10.8-7z"/></svg>',
    seekForward:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5v14l9.5-7z"/><path d="M12.5 5v14L22 12z"/></svg>',
  };

  // action は ICONS のキーであり、mountButtons に渡すハンドラのキーでもある
  const BUTTON_SPECS = [
    { action: 'seekBack', label: '1 秒戻す', settingKey: 'seekBackKey' },
    { action: 'stepBack', label: '1 コマ戻す', settingKey: 'stepBackKey' },
    { action: 'shoot', label: '撮影', settingKey: 'captureKey' },
    { action: 'stepForward', label: '1 コマ送る', settingKey: 'stepForwardKey' },
    { action: 'seekForward', label: '1 秒送る', settingKey: 'seekForwardKey' },
  ];

  let barHandlers = null;
  let barEnabled = true;

  // 万一バーが複数できていても取りこぼさないよう全件を対象にする
  function getBars() {
    return document.querySelectorAll('.sls-bar');
  }

  // バーの表示可否は「設定で有効か」と「一時停止中か」の論理積だけで決まる。
  // 設定 OFF で DOM から削除する方式にすると、MutationObserver による再挿入と
  // 競合して状態が二重管理になるため、常に DOM に置いたまま CSS で切り替える。
  function syncBarVisibility() {
    const visible = barEnabled && SLS.player.isPaused();
    for (const bar of getBars()) {
      bar.classList.toggle('sls-hidden', !visible);
    }
  }

  // 動画領域のクリックは再生/一時停止の切り替えに使われており、しかも click では
  // なく pointerdown 段階で処理されることがある。click だけを止めても間に合わない
  // ため、ポインタ系イベントを全て capture フェーズで捕まえ、バーの外へ漏らさない。
  const SWALLOWED_EVENTS = [
    'pointerdown',
    'mousedown',
    'pointerup',
    'mouseup',
    'click',
    'dblclick',
  ];

  function swallow(event) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  }

  function onBarClick(event) {
    const button = event.target.closest('.sls-btn');
    if (!button || !barHandlers) return;
    const handler = barHandlers[button.dataset.slsAction];
    if (handler) handler();
  }

  function buildBar() {
    const bar = document.createElement('div');
    bar.className = 'sls-bar sls-hidden';
    for (const spec of BUTTON_SPECS) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'sls-btn';
      button.dataset.slsAction = spec.action;
      button.innerHTML = ICONS[spec.action];
      bar.appendChild(button);
    }
    return bar;
  }

  // 握り潰しは document の capture で行う。バー要素に付けると、capture が祖先から
  // 降りてくる性質上、プレイヤー側が祖先要素の capture に持っているハンドラに先を
  // 越される。バーは 1 つとは限らないので、要素ではなくセレクタで判定する。
  function swallowBarPointerEvents() {
    for (const type of SWALLOWED_EVENTS) {
      document.addEventListener(
        type,
        (event) => {
          const target = event.target;
          if (!target || typeof target.closest !== 'function') return;
          if (!target.closest('.sls-bar')) return;
          swallow(event);
          if (type === 'click') onBarClick(event);
        },
        true
      );
    }
  }

  // SLS.settings を優先して読む。mountButtons に渡された settings は
  // 起動時のオブジェクトで、設定変更後は古くなっているため。
  function updateButtonLabels(settings) {
    const current = SLS.settings || settings || {};
    for (const bar of getBars()) {
      for (const spec of BUTTON_SPECS) {
        const button = bar.querySelector(`[data-sls-action="${spec.action}"]`);
        if (!button) continue;
        const hotkey = SLS.format.formatHotkey(current[spec.settingKey], META_LABEL);
        const text = hotkey ? `${spec.label} (${hotkey})` : spec.label;
        button.title = text;
        button.setAttribute('aria-label', text);
      }
    }
  }

  // バーはプレイヤールート (.ulizahtml5) の直下に置く。コントロールバーの中に
  // 入れると video.js の flex レイアウト (order 指定) に巻き込まれ、既存ボタンの
  // 並びが崩れる。.ulizahtml5 は position: relative を持つフルスクリーン対象要素
  // そのものなので、絶対配置の基準にでき、全画面でもそのまま表示される。
  //
  // barEnabled が false でもバーは作る。表示可否は syncBarVisibility に
  // 一本化されており、ここで作らない判断を混ぜると状態が二重管理になる。
  function attachBar(settings) {
    const host = SLS.player.getContainer();
    if (!host) return;
    if (!host.querySelector(':scope > .sls-bar')) {
      host.appendChild(buildBar());
      updateButtonLabels(settings);
    }
    syncBarVisibility();
  }

  // action は ICONS のキーとハンドラのキーを兼ねているため、名前がずれると
  // アイコンが空になったり押しても無反応になったりする。どちらも silent に
  // 壊れて気付けないので、起動時に照合して警告する (verifySelectors と同じ狙い)。
  function verifyActions(handlers) {
    const broken = BUTTON_SPECS.filter(
      (spec) => !ICONS[spec.action] || typeof handlers[spec.action] !== 'function'
    ).map((spec) => spec.action);
    if (broken.length > 0) {
      console.warn(
        '[Singular Live Screenshot] action に対応するアイコンかハンドラがありません:',
        broken
      );
    }
  }

  function mountButtons(handlers, settings) {
    verifyActions(handlers);
    barHandlers = handlers;
    injectStyles();
    swallowBarPointerEvents();
    attachBar(settings);
    SLS.player.onControlHostChange(() => attachBar(settings));
    SLS.player.onPauseStateChange(() => syncBarVisibility());
  }

  function setButtonsEnabled(enabled) {
    barEnabled = Boolean(enabled);
    syncBarVisibility();
  }

  SLS.ui = {
    injectStyles,
    showToast,
    mountButtons,
    setButtonsEnabled,
    updateButtonLabels,
  };
})();
