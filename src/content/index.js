// エントリポイント。設定の読み込みとキー入力の配線を担う。
(function () {
  'use strict';

  const SLS = (globalThis.SLS = globalThis.SLS || {});
  // manifest.json を唯一の出所にする。ここに数値を直書きすると、
  // バージョンを上げたときに片方だけ直し忘れて console が嘘をつく。
  SLS.version = chrome.runtime.getManifest().version;

  // content script は singular-live.thinkr.jp の全ページに注入されるが、再生ページ以外では
  // 何もしない。トップページや番組一覧でキー入力を監視する必要はなく、
  // セレクタ検証の警告を出すのもノイズにしかならない。
  if (!SLS.player.isPlayPage()) return;

  let settings = Object.assign({}, SLS.defaults);
  SLS.settings = settings;

  function loadSettings() {
    chrome.storage.sync.get(SLS.defaults, (stored) => {
      if (chrome.runtime.lastError) {
        console.error(
          '[Singular Live Screenshot] 設定の読み込みに失敗しました:',
          chrome.runtime.lastError.message
        );
        return;
      }
      settings = Object.assign({}, SLS.defaults, stored);
      SLS.settings = settings;
      SLS.ui.setButtonsEnabled(settings.showButtons);
      SLS.ui.updateButtonLabels(settings);
    });
  }

  // オプションページでの変更を、ページをリロードせずに反映する
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'sync') return;
    for (const [key, change] of Object.entries(changes)) {
      settings[key] = change.newValue;
    }
    SLS.ui.setButtonsEnabled(settings.showButtons);
    SLS.ui.updateButtonLabels(settings);
  });

  // 入力欄にフォーカスがあるときはホットキーを奪わない
  function isTypingTarget(target) {
    if (!target || !target.tagName) return false;
    const tag = target.tagName;
    return (
      tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable === true
    );
  }

  // ブラウザの自動再生ポリシーにより、ページに最初のユーザー操作が入った時点で、
  // 保留されていた再生が解禁されて動き出す。バーのクリックもホットキーもその
  // 「操作」に数えられるため、こちらの操作をきっかけに勝手に再生が始まる。
  // preventDefault も stopImmediatePropagation も操作の成立自体は妨げないので、
  // イベントを止める方向では直らない。変わってしまった状態を戻す。
  //
  // 監視は短時間だけ張る。長く張ると、こちらの操作の直後にユーザーが自分で
  // 再生ボタンを押したときまで止めてしまう。
  const PLAY_GUARD_MS = 300;

  function holdPlayState() {
    const video = SLS.player.getVideo();
    // 再生中の撮影は妨げない。止めるのは「止まっていたのに動き出した」場合だけ
    if (!video || !video.paused) return;
    const undo = () => video.pause();
    video.addEventListener('play', undo);
    setTimeout(() => video.removeEventListener('play', undo), PLAY_GUARD_MS);
  }

  // 失敗時の扱いはどの操作も同じ (console に残してトーストで知らせる) なので
  // 1 か所にまとめる。what はトーストではなく console 向けの操作名。
  async function run(what, action) {
    holdPlayState();
    try {
      await action();
    } catch (error) {
      console.error(`[Singular Live Screenshot] ${what}に失敗しました:`, error);
      SLS.ui.showToast(error.message, true);
    }
  }

  const doCapture = () =>
    run('撮影', async () => {
      const filename = await SLS.capture.shoot(settings.downloadSubdir);
      SLS.ui.showToast(`保存しました: ${filename}`);
    });
  const doStep = (direction) => run('コマ送り', () => SLS.stepper.step(direction));
  const doSeek = (direction) => run('1 秒送り', () => SLS.stepper.seek(direction));

  // ホットキーの設定名 → 実行する操作。settings は設定変更のたびに差し替わるので、
  // ホットキーの値ではなく設定名を持ち、照合時に引く。
  const SEEK_BINDINGS = [
    ['stepForwardKey', doStep, 1],
    ['stepBackKey', doStep, -1],
    ['seekForwardKey', doSeek, 1],
    ['seekBackKey', doSeek, -1],
  ];

  // capture フェーズで受け取り、singular-live 側のハンドラより先に判定する
  function onKeyDown(event) {
    if (isTypingTarget(event.target)) return;

    if (SLS.format.matchesHotkey(event, settings.captureKey)) {
      event.preventDefault();
      event.stopPropagation();
      doCapture();
      return;
    }

    // シーク系は一時停止中のみ。再生中は singular-live 本来の 10 秒送りを妨げない
    if (!SLS.player.isPaused()) return;

    for (const [settingKey, move, direction] of SEEK_BINDINGS) {
      if (!SLS.format.matchesHotkey(event, settings[settingKey])) continue;
      event.preventDefault();
      event.stopPropagation();
      move(direction);
      return;
    }
  }

  // キーは ui.js の BUTTON_SPECS の action と対応させる
  SLS.ui.mountButtons(
    {
      seekBack: () => doSeek(-1),
      stepBack: () => doStep(-1),
      shoot: () => doCapture(),
      stepForward: () => doStep(1),
      seekForward: () => doSeek(1),
    },
    settings
  );

  document.addEventListener('keydown', onKeyDown, true);
  loadSettings();

  // 想定した要素が無ければ警告する。silent に動かなくなるのを防ぐ
  const missing = SLS.player.verifySelectors();
  if (missing.length > 0) {
    console.warn(
      '[Singular Live Screenshot] 想定した要素が見つかりません。singular-live の DOM 構造が変わった可能性があります:',
      missing
    );
  }

  console.info('[Singular Live Screenshot] content script を読み込みました', SLS.version);
})();
