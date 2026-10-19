/**
 * Shisir Acharya — Typing Speed Test Application
 * Vanilla JS, zero dependencies. Wires the engine, charts, history,
 * settings, keyboard input, and the results/history dashboards together.
 */

document.addEventListener('DOMContentLoaded', () => {
  TypingApp.init();
});

window.TypingApp = (function () {
  'use strict';

  /* ======================================================================
     Constants & defaults
     ====================================================================== */

  const TIME_PRESETS = [15, 30, 60, 120];
  const WORD_PRESETS = [10, 25, 50, 100];

  const DEFAULT_SETTINGS = {
    mode: 'time',           // 'time' | 'words'
    timeLimit: 30,
    wordLimit: 25,
    customTime: 45,         // remembered custom values
    customWords: 75,
    content: 'common',      // common|random|sentences|punctuation|numbers|mixed|custom|code
    language: 'en',
    difficulty: 'beginner',
    complexity: 'easy',     // 'easy' | 'complex' — easy = familiar words & short sentences; complex = challenging vocab
    uppercase: false,
    punctuation: false,
    customText: '',
    countdown: false,       // brief countdown before start
    stopOnError: false
  };

  const DEFAULT_PREFS = {
    sound: true,
    caret: 'block',         // block | line | underline
    fontSize: 2.0,          // rem for typing text
    width: 900,             // px max width of typing area
    focusMode: false,
    targetWpm: 0,           // 0 = no target
    showLiveStats: false,
    helpSeen: false,
    reducedMotion: window.matchMedia('(prefers-reduced-motion: reduce)').matches
  };

  /* ======================================================================
     Module state
     ====================================================================== */

  let settings = {};
  let prefs = {};
  let engine = null;
  let currentView = 'test';        // test | results | history
  let result = null;               // latest finished result (full detail)
  let historyFilter = { mode: 'all', limit: 'all', content: 'all', period: 'day' };
  let inputLocked = false;         // during countdown / finished
  let audioCtx = null;
  let countdownTimer = null;
  let timeTickTimer = null;
  let confirmActive = false;
  let pendingRestart = null;
  let charSpans = [];              // per-char <span> cache for the typing text
  let charWordIndex = [];          // word index per char (for word-level review)
  let wordSpans = [];              // cache of .tt-word elements
  let lineTops = [];               // cache of line vertical offsets
  let currentWordIdx = -1;
  let lastTypedLen = 0;
  let lastSecondShown = -1;
  let liveStatsVisible = false;
  let skippedWords = 0;
  let pendingResetConfirm = false;
  let lastCorrectedLen = 0;

  const $ = (id) => document.getElementById(id);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));

  /* ======================================================================
     Init
     ====================================================================== */

  function init() {
    settings = TypingHistory.loadSettings(DEFAULT_SETTINGS);
    prefs = TypingHistory.loadPrefs(DEFAULT_PREFS);
    if (prefs.reducedMotion) document.documentElement.setAttribute('data-reduced-motion', '1');
    liveStatsVisible = !!prefs.showLiveStats;

    initTheme();
    initEngine();
    buildSettingsUI();
    bindChrome();
    bindTestControls();
    bindInput();
    bindShortcuts();
    bindHistoryUI();
    applyPrefsToUI();
    ensureCaret();
    newTest({ silent: true });

    if (!prefs.helpSeen) showHelp();
    window.addEventListener('beforeunload', teardown);
  }

  function teardown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    clearTimeTick();
    if (engine) engine.destroy();
  }

  /* ======================================================================
     Theme
     ====================================================================== */

  function initTheme() {
    const btn = $('theme-toggle');
    const meta = document.querySelector('meta[name="theme-color"]');
    const saved = localStorage.getItem('typing-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));

    if (btn) {
      btn.addEventListener('click', () => {
        const cur = document.documentElement.getAttribute('data-theme') || 'light';
        const next = cur === 'light' ? 'dark' : 'light';
        setTheme(next);
        try { localStorage.setItem('typing-theme', next); } catch (e) { /* ignore */ }
        // re-render charts with new palette
        if (currentView === 'results' && result) renderResultCharts();
        if (currentView === 'history') renderHistory();
      });
    }

    function setTheme(theme) {
      document.documentElement.setAttribute('data-theme', theme);
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#10100F' : '#F7F5F0');
      if (btn) {
        btn.innerHTML = theme === 'dark'
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>'
          : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
      }
    }
  }

  /* ======================================================================
     Engine
     ====================================================================== */

  function initEngine() {
    engine = TypingEngine.createEngine({ mode: settings.mode, limit: limitValue(), text: '' });

    engine.on('update', onEngineUpdate);
    engine.on('finish', onEngineFinish);
    engine.on('state', onEngineState);
  }

  function startTimeTick() {
    clearTimeTick();
    timeTickTimer = setInterval(() => {
      if (!engine) return;
      const state = engine.getState();
      if (state === 'idle' || state === 'paused') return;
      if (state === 'finished') { clearTimeTick(); return; }
      renderLiveStats(engine.liveStats());
      updateTypedClasses();
      scrollCaretIntoView();
      if (engine.liveStats().mode === 'time' && engine.getElapsedMs() >= engine.getConfig().limit * 1000) {
        try { engine.finish('time'); } catch (e) { clearTimeTick(); }
      }
    }, 100);
  }

  function clearTimeTick() {
    if (timeTickTimer) { clearInterval(timeTickTimer); timeTickTimer = null; }
  }

  function limitValue() {
    return settings.mode === 'time' ? settings.timeLimit : settings.wordLimit;
  }

  function onEngineUpdate(stats) {
    skippedWords = typeof stats.skippedWords === 'number' ? stats.skippedWords : skippedWords;
    renderLiveStats(stats);
    if (engine.getState() === 'running') {
      if (settings.mode === 'time') {
        const remaining = engine.getText().length - engine.getTyped().length;
        if (remaining < 60) topUpText();
        else if (remaining < 120) {
          // Schedule a non-blocking top-up for smoother pacing.
          if (!topUpText._scheduled) {
            topUpText._scheduled = true;
            requestAnimationFrame(() => { topUpText._scheduled = false; if (engine.getState() === 'running') topUpText(); });
          }
        }
      }
      updateTypedClasses();
      scrollCaretIntoView();
    }
  }

  function onEngineState(state) {
    if (state === 'running') startTimeTick();
    if (state === 'finished' || state === 'idle') clearTimeTick();
  }

  function onEngineFinish(res) {
    stopCountdown();
    clearTimeTick();
    inputLocked = true;
    result = res;
    if (!res.validation || !res.validation.isInvalid) {
      TypingHistory.add(res);
    }
    hideIdleHint();
    playSound('finish');
    renderResults(res);
    showView('results');
    // Keep focus on Restart so Space/Enter never re-triggers typing.
    const ti = document.getElementById('typing-input');
    if (ti) ti.blur();
  }

  function topUpText() {
    const more = TypingData.generateText({
      mode: 'time',
      limit: 50,
      content: settings.content === 'custom' ? 'common' : settings.content,
      language: settings.language,
      difficulty: settings.difficulty,
      complexity: settings.complexity,
      uppercase: settings.uppercase,
      punctuation: settings.punctuation
    });
    if (more) engine.extendText(more);
    const typedLen = engine.getTyped().length;
    const text = engine.getText();
    const frag = document.createDocumentFragment();
    const start = charSpans.length;
    const extraText = text.slice(start);
    const lines = extraText.split('\n');
    lines.forEach((line, li) => {
      if (li > 0) {
        const nl = document.createElement('span');
        nl.className = 'tt-char tt-newline';
        nl.textContent = '';
        frag.appendChild(nl);
        charSpans.push(nl);
        charWordIndex.push(-1);
      }
      let remainingLine = line;
      if (remainingLine.startsWith(' ')) {
        const sp = document.createElement('span');
        sp.className = 'tt-char tt-space';
        sp.textContent = ' ';
        frag.appendChild(sp);
        charSpans.push(sp);
        charWordIndex.push(-1);
        remainingLine = remainingLine.slice(1);
      }
      if (!remainingLine) return;
      const words = remainingLine.split(' ');
      words.forEach((word, wi) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'tt-word';
        for (let c = 0; c < word.length; c++) {
          const cs = document.createElement('span');
          cs.className = 'tt-char';
          cs.textContent = word[c];
          wordSpan.appendChild(cs);
          charSpans.push(cs);
          charWordIndex.push(charWordIndex.length);
        }
        frag.appendChild(wordSpan);
        if (wi < words.length - 1) {
          const sp = document.createElement('span');
          sp.className = 'tt-char tt-space';
          sp.textContent = ' ';
          frag.appendChild(sp);
          charSpans.push(sp);
          charWordIndex.push(-1);
        }
      });
    });
    $('typing-text').appendChild(frag);
    lastTypedLen = typedLen;
    updateTypedClasses();
  }

  /* ======================================================================
     Test lifecycle
     ====================================================================== */

  function newTest(opts) {
    opts = opts || {};
    const wasTestView = currentView === 'test';
    stopCountdown();
    clearTimeTick();
    closePanel('settings-panel');
    closePanel('history-panel');
    const scrim0 = document.getElementById('tt-scrim'); if (scrim0) scrim0.classList.remove('open');
    const confirmOverlay = document.getElementById('confirm-overlay'); if (confirmOverlay) confirmOverlay.classList.remove('open');
    const helpOverlay = document.getElementById('help-overlay'); if (helpOverlay) helpOverlay.classList.remove('open');
    const pauseOverlay = document.getElementById('pause-overlay'); if (pauseOverlay) pauseOverlay.classList.remove('open');
    result = null;
    inputLocked = false;
    lastTypedLen = 0;
    resetTypingScroll();
    skippedWords = 0;
    lastCorrectedLen = 0;
    prevInputValue = '';
    const activeEl = document.activeElement;
    if (activeEl && activeEl !== document.body) {
      try { activeEl.blur(); } catch (e) {}
    }
    const ti = document.getElementById('typing-input');
    if (ti) { ti.value = ''; delete ti.dataset.pending; }
    if (wasTestView && document.activeElement && document.activeElement.tagName === 'BUTTON') {
      try { document.activeElement.blur(); } catch (e) {}
    }

    const text = buildText();
    if (!text) {
      showView('test');
      setEmptyTextMessage();
      return;
    }

    engine.reset({
      mode: settings.mode,
      limit: limitValue(),
      text: text,
      meta: {
        content: settings.content,
        language: settings.language,
        difficulty: settings.difficulty,
        practice: !!opts.practice || !!opts.practiceMode,
        daily: !!opts.daily,
        uppercase: settings.uppercase,
        punctuation: settings.punctuation,
        targetWpm: prefs.targetWpm || 0
      }
    });

    renderText();
    showView('test');
    renderModeChips();
    clearResultPanels();
    focusInput(true);
    onEngineUpdate(engine.liveStats());
    // Timer starts only on first keystroke now.
    if (!opts.silent) playSound('soft');
  }

  function buildText() {
    const t = TypingData.generateText({
      mode: settings.mode,
      limit: limitValue(),
      content: settings.content,
      language: settings.language,
      difficulty: settings.difficulty,
      complexity: settings.complexity,
      uppercase: settings.uppercase,
      punctuation: settings.punctuation,
      customText: settings.customText
    });
    return (t || '').trim();
  }

  function setEmptyTextMessage() {
    const el = $('typing-text');
    el.innerHTML = '<span class="tt-placeholder">Custom text is empty — add some text in Settings → Content → Custom, then start a new test.</span>';
    charSpans = [];
  }

  function requestRestart() {
    const st = engine.getState();
    if ((st === 'running') && engine.getTyped().length > 0) {
      showRestartConfirm(() => newTest());
    } else {
      newTest();
    }
  }

  function showRestartConfirm(onYes) {
    if (confirmActive) return;
    confirmActive = true;
    const overlay = $('confirm-overlay');
    overlay.classList.add('open');
    const yes = $('confirm-yes');
    const no = $('confirm-no');
    const previousFocus = document.activeElement;
    yes.focus();

    function close() {
      overlay.classList.remove('open');
      confirmActive = false;
      yes.removeEventListener('click', onYesClick);
      no.removeEventListener('click', onNoClick);
      overlay.removeEventListener('click', onOverlayClick);
      document.removeEventListener('keydown', onKey, true);
      if (previousFocus && previousFocus.focus) previousFocus.focus();
      focusInput(true);
    }
    function onYesClick() { close(); onYes(); }
    function onNoClick() { close(); }
    function onOverlayClick(e) { if (e.target === overlay) close(); }
    function onKey(e) {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
      else if (e.key === 'Enter') { e.preventDefault(); close(); onYes(); }
    }
    yes.addEventListener('click', onYesClick);
    no.addEventListener('click', onNoClick);
    overlay.addEventListener('click', onOverlayClick);
    document.addEventListener('keydown', onKey, true);
  }

  function openSettings() { togglePanel('settings-panel'); }

  /* ======================================================================
     Countdown (for the explicit countdown toggle)
     ====================================================================== */

  function startCountdown(seconds, done) {
    stopCountdown();
    inputLocked = true;
    const overlay = $('countdown-overlay');
    const label = $('countdown-label');
    let n = seconds;
    overlay.classList.add('open');
    label.textContent = n;
    countdownTimer = setInterval(() => {
      n--;
      if (n <= 0) {
        stopCountdown();
        done();
      } else {
        label.textContent = n;
        playSound('tick');
      }
    }, 1000);
  }

  function stopCountdown() {
    if (countdownTimer) { clearInterval(countdownTimer); countdownTimer = null; }
    $('countdown-overlay').classList.remove('open');
    inputLocked = engine && engine.getState() === 'finished';
  }

  /* ======================================================================
     Input handling (hidden textarea keeps mobile + desktop consistent)
     ====================================================================== */

  function focusInput() {
    const input = document.getElementById('typing-input');
    if (input) input.focus({ preventScroll: true });
  }

  function bindInput() {
    const input = $('typing-input');
    const textWrap = $('typing-text-wrap');
    const viewport = $('typing-viewport');

    const isTypingContext = () => currentView === 'test' && engine.getState() !== 'finished';

    const focusFromViewport = (e) => {
      focusInput(true);
      if (e && e.cancelable) e.preventDefault();
    };

    viewport.addEventListener('mousedown', (e) => {
      if (!isTypingContext()) return;
      focusFromViewport(e);
    });
    viewport.addEventListener('click', (e) => {
      if (!isTypingContext()) return;
      focusFromViewport(e);
    });
    textWrap.addEventListener('mousedown', (e) => {
      if (!isTypingContext()) return;
      focusFromViewport(e);
    });
    textWrap.addEventListener('click', (e) => {
      if (!isTypingContext()) return;
      focusFromViewport(e);
    });
    document.addEventListener('mousedown', (e) => {
      if (!isTypingContext()) return;
      if (e.target.closest('a, button, select, input, textarea, .side-panel, .tt-scrim, .modal-overlay-center, .site-header')) return;
      focusInput(true);
    });
    document.addEventListener('click', (e) => {
      if (!isTypingContext()) return;
      if (e.target.closest('a, button, select, input, textarea, .side-panel, .tt-scrim, .modal-overlay-center, .site-header')) return;
      focusInput(true);
    });
    document.addEventListener('keydown', (e) => {
      if (currentView !== 'test') return;
      if (engine.getState() === 'finished') return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === 'F1' || e.key === 'F2' || e.key === 'F3' || e.key === 'F4' || e.key.startsWith('F')) return;
      if (e.key === 'Escape' || e.key === 'Tab') return;
      if (isFormTarget(e)) return;
      if (document.activeElement === input) return;
      if (e.key.length === 1 || e.key === 'Backspace' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        focusInput(true);
        const tag = e.key.length === 1 ? e.key : e.key === ' ' ? ' ' : e.key === 'Enter' ? '\n' : '';
        if (e.key === 'Backspace') {
          if (input.value.length > 0) {
            input.value = input.value.slice(0, -1);
            input.dispatchEvent(new InputEvent('input', { bubbles: true, data: null, inputType: 'deleteContentBackward' }));
          }
          return;
        }
        if (!tag) return;
        if (tag === '\n') {
          if (engine.currentWordHasError && engine.currentWordHasError()) return;
          input.value += '\n';
        } else {
          input.value += tag;
        }
        input.dispatchEvent(new InputEvent('input', { bubbles: true, data: tag, inputType: 'insertText' }));
      }
    });

    input.addEventListener('blur', () => {
      if (engine.getState() === 'running') {
        engine.pause();
        $('pause-overlay').classList.add('open');
      }
    });

    input.addEventListener('focus', () => {
      $('pause-overlay').classList.remove('open');
      if (engine.getState() === 'paused') {
        engine.resume();
      }
    });

    input.addEventListener('paste', (e) => {
      e.preventDefault(); // pasting is not typing
    });

    input.addEventListener('beforeinput', (e) => {
      if (engine.getState() !== 'running') return;
      if (e.inputType !== 'insertText' || e.data !== ' ') return;
      if (!engine.currentWordHasError || !engine.currentWordHasError()) return;
      if (engine.getState() === 'finished' || inputLocked) return;
      e.preventDefault();
      const ok = engine.skipWord();
      if (!ok) return;
      skippedWords = engine.liveStats().skippedWords || skippedWords;
      input.value = engine.getTyped();
      hideIdleHint();
      updateTypedClasses();
      scrollCaretIntoView();
      maybePlayKeySounds(input.value);
    });

    input.addEventListener('input', () => {
      if (inputLocked) { input.value = engine.getTyped(); return; }
      if (engine.getState() === 'finished') { input.value = engine.getTyped(); return; }

      const st = engine.getState();
      if (st === 'idle') {
        if (settings.countdown) {
          const first = input.value || '';
          input.value = '';
          inputLocked = true;
          input.dataset.pending = first;
          startCountdown(3, () => {
            inputLocked = false;
            focusInput(true);
            if (engine.getState() !== 'idle') return;
            if (!engine.start()) return;
            startTimeTick();
            onEngineUpdate(engine.liveStats());
            hideIdleHint();
            const pending = input.dataset.pending || '';
            if (pending) {
              delete input.dataset.pending;
              engine.syncFromValue(pending);
              input.value = engine.getTyped();
              maybePlayKeySounds(input.value);
            }
          });
          return;
        }
        if (!engine.start()) return;
        startTimeTick();
      }
      hideIdleHint();
      // Fallback skip for compositions / programmatic value sets where
      // beforeinput was not fired: if a single space was appended on an
      // incorrect current word, treat it as a skip.
      const curBefore = engine.getTyped();
      const nextVal = input.value;
      if (engine.getState() === 'running' && engine.currentWordHasError && engine.currentWordHasError() &&
          nextVal.length === curBefore.length + 1 && nextVal.endsWith(' ') && curBefore.length < engine.getText().length) {
        const tail = engine.getText().slice(curBefore.length, curBefore.length + 1);
        if (tail !== ' ') {
          engine.skipWord();
          skippedWords = engine.liveStats().skippedWords || skippedWords;
          input.value = engine.getTyped();
          updateTypedClasses();
          scrollCaretIntoView();
          maybePlayKeySounds(input.value);
          return;
        }
      }
      engine.syncFromValue(input.value);
      input.value = engine.getTyped();
      maybePlayKeySounds(input.value);
    });

    // Some browsers drop composition; force a resync on composition end
    input.addEventListener('compositionend', () => {
      if (engine.getState() === 'finished') return;
      engine.syncFromValue(input.value);
      input.value = engine.getTyped();
    });
  }

  let prevInputValue = '';
  function maybePlayKeySounds(val) {
    if (!prefs.sound) { prevInputValue = val; return; }
    if (val.length > prevInputValue.length) {
      const idx = val.length - 1;
      const expected = engine.getText()[idx];
      playSound(val[idx] === expected ? 'key' : 'error');
    }
    prevInputValue = val;
  }

  /* ======================================================================
     Keyboard shortcuts
     ====================================================================== */

  function bindSettingsReset() {
    const btn = document.getElementById('settings-reset-defaults');
    if (!btn || btn.dataset.bound === '1') return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', () => {
      if (pendingResetConfirm) return;
      pendingResetConfirm = true;
      const original = btn.textContent;
      btn.textContent = 'Confirm reset?';
      btn.classList.add('is-confirm');
      let timeout = setTimeout(() => {
        if (!pendingResetConfirm) return;
        pendingResetConfirm = false;
        btn.textContent = original;
        btn.classList.remove('is-confirm');
      }, 4000);
      const handler = (e) => {
        if (e.target === btn) {
          e.preventDefault();
          e.stopPropagation();
          clearTimeout(timeout);
          pendingResetConfirm = false;
          btn.textContent = original;
          btn.classList.remove('is-confirm');
          document.removeEventListener('click', handler, true);
          const restored = Object.assign({}, DEFAULT_SETTINGS);
          const keepSeen = prefs.helpSeen;
          const keepMotion = prefs.reducedMotion;
          settings = Object.assign({}, restored);
          prefs = Object.assign({}, DEFAULT_PREFS, { helpSeen: keepSeen, reducedMotion: keepMotion, showLiveStats: false });
          persistSettings();
          persistPrefs();
          liveStatsVisible = !!prefs.showLiveStats;
          applyPrefsToUI();
          buildSettingsUI();
          renderModeChips();
          closePanel('settings-panel');
          setTimeout(() => newTest(), 80);
        } else if (!e.target.closest || !e.target.closest('#settings-reset-defaults')) {
          clearTimeout(timeout);
          pendingResetConfirm = false;
          btn.textContent = original;
          btn.classList.remove('is-confirm');
          document.removeEventListener('click', handler, true);
        }
      };
      setTimeout(() => document.addEventListener('click', handler, true), 0);
    });
  }

  function bindShortcuts() {
    let tabPressed = false;

    document.addEventListener('keydown', (e) => {
      // Spacebar must never restart — not single, not double. On the
      // results page Space is blocked (prevent scroll/button-activation)
      // and left strictly for normal typing/word-skip during a test.
      const isSpace = e.key === ' ' || e.code === 'Space' || e.key === 'Spacebar';
      if (isSpace && currentView === 'results' && !isFormTarget(e)) {
        e.preventDefault();
        return;
      }
      // Single Enter to restart from the results page — ignored during typing
      // and when any modal/panel is open so Space stays untouched.
      if (currentView === 'results' && e.key === 'Enter' && !e.ctrlKey && !e.metaKey && !e.altKey && !isFormTarget(e)) {
        const toastActive = document.getElementById('record-toast') &&
          document.getElementById('record-toast').contains(document.activeElement);
        const activeSidePanel = document.getElementById('settings-panel').classList.contains('open') ||
          document.getElementById('history-panel').classList.contains('open') ||
          document.getElementById('confirm-overlay').classList.contains('open') ||
          document.getElementById('help-overlay').classList.contains('open') ||
          !!toastActive;
        if (!activeSidePanel) {
          e.preventDefault();
          newTest();
          return;
        }
      }
      // Tab → Enter restarts (Monkeytype-style), but only when tabbed from body
      if (e.key === 'Tab') { tabPressed = true; return; }

      if (e.key === 'Enter' && tabPressed && !isFormTarget(e)) {
        e.preventDefault();
        requestRestart();
        tabPressed = false;
        return;
      }
      tabPressed = false;

      if (isFormTarget(e)) return;

      // Esc toggles pause during a run
      if (e.key === 'Escape' && engine.getState() === 'running') {
        engine.pause();
        $('pause-overlay').classList.add('open');
        $('typing-input').blur();
        return;
      }
      // Ctrl/Cmd + R restart (prevent browser reload during a run)
      if ((e.ctrlKey || e.metaKey) && (e.key === 'r' || e.key === 'R') && engine.getState() === 'running') {
        e.preventDefault();
        requestRestart();
        return;
      }
      // F2 restarts
      if (e.key === 'F2') {
        e.preventDefault();
        requestRestart();
        return;
      }
      // Any printable key while paused resumes and refocuses
      if (engine.getState() === 'paused' && e.key.length === 1) {
        $('pause-overlay').classList.remove('open');
        engine.resume();
        focusInput(true);
      }
    });

    document.addEventListener('keyup', () => { tabPressed = false; });
  }

  function isFormTarget(e) {
    const t = e.target;
    if (!t) return false;
    const tag = (t.tagName || '').toLowerCase();
    if (tag === 'input' && t.id !== 'typing-input') return true;
    if (tag === 'textarea' && t.id !== 'typing-input') return true;
    if (tag === 'select') return true;
    if (t.isContentEditable) return true;
    // Settings / history panels open
    if ($('settings-panel').classList.contains('open')) return true;
    if ($('history-panel').classList.contains('open')) return true;
    if ($('help-overlay').classList.contains('open')) return true;
    return false;
  }

  /* ======================================================================
     Typing area rendering
     ====================================================================== */

  function ensureCaret() {
    const wrap = $('typing-text');
    let c = $('caret');
    // Keep the caret inside .typing-text: that element carries the
    // translateY line-scroll, so the caret travels with the text.
    if (!c || !wrap || c.parentNode !== wrap) {
      if (c && c.parentNode) c.parentNode.removeChild(c);
      c = document.createElement('div');
      c.id = 'caret';
      c.className = 'tt-caret';
      c.innerHTML = '<div class="tt-caret__bar"></div>';
      if (wrap) wrap.appendChild(c);
    } else if (!c.querySelector('.tt-caret__bar')) {
      c.innerHTML = '<div class="tt-caret__bar"></div>';
    }
    return c;
  }

  function syncCaret() {
    const caret = $('caret') || ensureCaret();
    const wrap = $('typing-text');
    if (!wrap || currentView !== 'test') { caret.style.display = 'none'; return; }

    const activeChar = wrap.querySelector('.tt-char.is-current') || wrap.querySelector('.tt-char');
    if (!activeChar) {
      caret.style.display = 'none';
      return;
    }

    caret.style.display = 'block';
    const x = activeChar.offsetLeft;
    const y = activeChar.offsetTop;
    const h = activeChar.offsetHeight || 28;

    caret.style.height = Math.max(14, h - 4) + 'px';
    // Outer element: vertical only (timed with the text's line scroll).
    caret.style.transform = `translate3d(0, ${y + 2}px, 0)`;
    // Inner bar: horizontal only (fast glide between characters).
    const bar = caret.querySelector('.tt-caret__bar');
    if (bar) bar.style.transform = `translate3d(${x - 1}px, 0, 0)`;
  }

  function renderText() {
    const text = engine.getText();
    const wrap = $('typing-text');
    const viewport = document.querySelector('.typing-viewport');
    if (viewport) viewport.scrollTop = 0;
    wrap.style.transform = 'translateY(0)';

    // Clear the old passage but keep the floating caret node alive.
    Array.prototype.slice.call(wrap.childNodes).forEach((n) => {
      if (!n.classList || !n.classList.contains('tt-caret')) wrap.removeChild(n);
    });
    const caret = ensureCaret();
    // Teleport both axes instantly on reset (no glide across the old text).
    caret.style.transition = 'none';
    const bar = caret.querySelector('.tt-caret__bar');
    if (bar) bar.style.transition = 'none';
    caret.style.display = 'block';

    charSpans = [];
    charWordIndex = [];
    wordSpans = [];
    lineTops = [];
    currentWordIdx = -1;

    if (!text) {
      setEmptyTextMessage();
      ensureCaret();
      return;
    }

    const frag = document.createDocumentFragment();
    const isCode = settings.content === 'code';
    wrap.classList.toggle('is-code', isCode);

    const lines = text.split('\n');
    let charIndex = 0;
    lines.forEach((line, li) => {
      if (li > 0) {
        const nl = document.createElement('span');
        nl.className = 'tt-char tt-newline';
        nl.textContent = '';
        frag.appendChild(nl);
        charSpans.push(nl);
        charWordIndex.push(-1);
        charIndex++;
      }
      const words = line.split(' ');
      words.forEach((word, wi) => {
        const wordSpan = document.createElement('span');
        wordSpan.className = 'tt-word';
        wordSpans.push(wordSpan);
        const wIdx = wordSpans.length - 1;
        for (let c = 0; c < word.length; c++) {
          const cs = document.createElement('span');
          cs.className = 'tt-char';
          cs.textContent = word[c];
          wordSpan.appendChild(cs);
          charSpans.push(cs);
          charWordIndex.push(wIdx);
          charIndex++;
        }
        frag.appendChild(wordSpan);
        if (wi < words.length - 1) {
          const sp = document.createElement('span');
          sp.className = 'tt-char tt-space';
          sp.textContent = ' ';
          frag.appendChild(sp);
          charSpans.push(sp);
          charWordIndex.push(-1);
          charIndex++;
        }
      });
    });

    wrap.appendChild(frag);
    
    // Measure line offsets once, then render state
    requestAnimationFrame(() => {
      const tops = new Set();
      wordSpans.forEach(w => tops.add(w.offsetTop));
      lineTops = Array.from(tops).sort((a, b) => a - b);
      const finish = () => {
        updateTypedClasses();
        syncCaret();
        scrollToActiveWord();
        // Re-enable axis transitions only after snap position is applied.
        requestAnimationFrame(() => {
          caret.style.transition = '';
          if (bar) bar.style.transition = '';
        });
      };
      // If lineTops is degenerate (no layout — hidden viewport or zero width), keep as-is and retry on next frame
      if (lineTops.length <= 1 && wordSpans.length > 1) {
        requestAnimationFrame(finish);
      } else {
        finish();
      }
    });

  }

  function updateTypedClasses() {
    const typed = engine.getTyped();
    const text = engine.getText();
    const state = engine.getState();
    const prevLen = lastTypedLen;
    const n = Math.max(typed.length + 1, prevLen);

    const wordErrorMap = (() => {
      const len = Math.min(typed.length, text.length);
      const byWord = {};
      for (let i = 0; i < len; i++) {
        if (typed[i] !== text[i]) {
          const wIdx = charWordIndex[i];
          if (wIdx !== -1) byWord[wIdx] = (byWord[wIdx] || 0) + 1;
        }
      }
      return byWord;
    })();

    let activeWordIdx = -1;
    if (state !== 'finished') {
      activeWordIdx = charWordIndex[typed.length];
      if (activeWordIdx === -1) {
        // Find next word if on space/newline
        for (let i = typed.length; i < charWordIndex.length; i++) {
          if (charWordIndex[i] !== -1) { activeWordIdx = charWordIndex[i]; break; }
        }
      }
    }

    for (let i = 0; i < n; i++) {
      const span = charSpans[i];
      if (!span) continue;
      const isSpace = span.classList.contains('tt-space');
      const isNewline = span.classList.contains('tt-newline');
      let base = 'tt-char ';
      if (isSpace) base += 'tt-space ';
      else if (isNewline) base += 'tt-newline ';
      if (i < typed.length) {
        const ok = typed[i] === text[i];
        if (ok) span.className = base + 'is-correct';
        else {
          const wIdx = charWordIndex[i];
          const isSkipped = isSpace && wIdx !== -1 && wordErrorMap[wIdx] > 0;
          if (isSkipped) span.className = base + 'is-missed';
          else span.className = base + 'is-incorrect';
        }
      } else if (i === typed.length && state !== 'finished') {
        span.className = base + 'is-current';
      } else {
        const missed = i < text.length && i >= typed.length && state === 'finished' ? ' is-missed' : '';
        span.className = (base.trim() || 'tt-char') + missed;
      }
    }

    if (activeWordIdx !== currentWordIdx) {
      if (currentWordIdx !== -1 && wordSpans[currentWordIdx]) {
        wordSpans[currentWordIdx].classList.remove('is-active');
      }
      if (activeWordIdx !== -1 && wordSpans[activeWordIdx]) {
        wordSpans[activeWordIdx].classList.add('is-active');
      }
      currentWordIdx = activeWordIdx;
    }

    if (typed.length < prevLen) {
      const cur = charSpans[typed.length];
      if (cur && typed.length > 0 && text[typed.length - 1] === typed[typed.length - 1]) {
        cur.classList.add('is-recovered');
        setTimeout(() => cur.classList.remove('is-recovered'), 220);
        if (!prefs.reducedMotion) playTone(680, 0.05, 'sine', 0.015);
      }
      lastCorrectedLen = typed.length;
    } else if (typed.length > prevLen) {
      const justCompletedWord = prevLen > 0 && text[prevLen - 1] !== ' ' && (typed.length > text.length || text[typed.length - 1] === ' ' || text[typed.length] === ' ');
      if (justCompletedWord) {
        let wordClean = true;
        const wsIdx = charWordIndex[prevLen - 1];
        if (wsIdx !== -1) {
          // Check if word was clean
          for (let i = 0; i < text.length; i++) {
            if (charWordIndex[i] === wsIdx && typed[i] !== text[i]) { wordClean = false; break; }
          }
        }
        if (wordClean && !prefs.reducedMotion) playTone(1050, 0.04, 'sine', 0.012);
      }
      lastCorrectedLen = typed.length;
    }
    renderExtraChars(typed, text);
    lastTypedLen = typed.length;
    syncCaret();
  }

  function renderExtraChars(typed, text) {
    const tray = $('extra-chars');
    if (!tray) return;
    if (typed.length <= text.length) { tray.innerHTML = ''; return; }
    const extra = typed.slice(text.length);
    tray.textContent = extra;
  }

  // Smooth line-by-line scrolling: maintains the active line at a steady position.
  const ACTIVE_ROW_INDEX = 1;
  let lastScrolledRow = 0;
  let _scrollRaf = 0;

  function resetTypingScroll() {
    lastScrolledRow = 0;
    if (_scrollRaf) { cancelAnimationFrame(_scrollRaf); _scrollRaf = 0; }
    const viewport = document.querySelector('.typing-viewport');
    if (viewport) {
      viewport.scrollTop = 0;
      const textEl = $('typing-text');
      if (textEl) textEl.style.transform = 'translateY(0)';
    }
  }

  function scrollToActiveWord() {
    if (_scrollRaf) return;
    _scrollRaf = requestAnimationFrame(() => {
      _scrollRaf = 0;
      const viewport = document.querySelector('.typing-viewport');
      const textEl = $('typing-text');
      const activeWord = wordSpans[currentWordIdx] || viewport?.querySelector('.tt-word.is-active');
      if (!viewport || !textEl || !activeWord) return;

      if (!lineTops.length) {
        const tops = new Set();
        wordSpans.forEach(w => tops.add(w.offsetTop));
        lineTops = Array.from(tops).sort((a, b) => a - b);
      }
      if (lineTops.length <= 1) return;

      const activeTop = activeWord.offsetTop;
      let activeRow = lineTops.indexOf(activeTop);
      if (activeRow === -1) {
        let best = 0; let bestDiff = Infinity;
        for (let i = 0; i < lineTops.length; i++) {
          const d = Math.abs(lineTops[i] - activeTop);
          if (d < bestDiff) { bestDiff = d; best = i; }
        }
        activeRow = best;
      }

      const targetRow = Math.max(0, activeRow - ACTIVE_ROW_INDEX);
      if (targetRow === lastScrolledRow) return;
      lastScrolledRow = targetRow;

      const targetScrollTop = lineTops[Math.min(targetRow, lineTops.length - 1)] || 0;
      textEl.style.transform = `translateY(${-targetScrollTop}px)`;
      syncCaret();
    });
  }

  function scrollCaretIntoView(force) {
    const viewport = document.querySelector('.typing-viewport');
    if (!viewport) return;
    if (force) {
      resetTypingScroll();
      requestAnimationFrame(() => scrollToActiveWord());
      return;
    }
    scrollToActiveWord();
  }

  window.addEventListener('resize', scrollToActiveWord);

  function hideIdleHint() {
    const el = document.getElementById('idle-hint');
    if (el) el.classList.remove('visible');
  }

  /* ======================================================================
     Live stats bar
     ====================================================================== */

  function renderLiveStats(stats) {
    const timerEl = $('stat-timer');
    if (stats.mode === 'time') {
      timerEl.textContent = formatSeconds(stats.remaining);
      const pct = Math.min(100, (stats.elapsedMs / (stats.limit * 1000)) * 100);
      $('progress-fill').style.width = pct + '%';
    } else {
      timerEl.textContent = formatTime(stats.elapsedMs);
      $('progress-fill').style.width = (stats.progress * 100) + '%';
    }

    $('stat-wpm').textContent = Math.round(stats.wpm);
    $('stat-raw').textContent = Math.round(stats.rawWpm);
    $('stat-acc').textContent = Math.round(stats.accuracy) + '%';

    // Hidden by default: secondary stats only appear when user opts in
    const liveStats = $('live-stats');
    if (liveStats) liveStats.classList.toggle('live-stats--expanded', liveStatsVisible);

    // Target comparison
    const targetEl = $('target-compare');
    if (prefs.targetWpm > 0) {
      targetEl.classList.add('visible');
      const diff = Math.round(stats.wpm - prefs.targetWpm);
      targetEl.textContent = (diff >= 0 ? '+' : '') + diff + ' vs target ' + prefs.targetWpm;
      targetEl.classList.toggle('above', diff >= 0);
      targetEl.classList.toggle('below', diff < 0);
    } else {
      targetEl.classList.remove('visible');
    }

    // Idle hint (optional — element was removed in minimal UI; guard for headless)
    const idleEl = document.getElementById('idle-hint');
    if (idleEl && stats.state === 'idle' && stats.typedLength === 0) {
      idleEl.classList.add('visible');
    }
  }

  function formatSeconds(s) {
    s = Math.max(0, Math.round(s));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }
  function formatTime(ms) {
    const s = Math.max(0, Math.floor(ms / 1000));
    return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0');
  }

  /* ======================================================================
     Mode chips & settings UI
     ====================================================================== */

  function renderModeChips() {
    const bar = $('mode-bar');
    bar.innerHTML = '';

    const left = document.createElement('div');
    left.className = 'mode-bar__left';

    const modeGroup = chipGroup([
      { label: 'time', active: settings.mode === 'time', onClick: () => setMode('time') },
      { label: 'words', active: settings.mode === 'words', onClick: () => setMode('words') }
    ], 'MODE');
    left.appendChild(modeGroup);

    const presets = settings.mode === 'time' ? TIME_PRESETS : WORD_PRESETS;
    const current = limitValue();
    const isPreset = presets.indexOf(current) !== -1;
    const items = presets.map((p) => ({
      label: settings.mode === 'time' ? p + 's' : String(p),
      active: current === p,
      onClick: () => setLimit(p)
    }));
    if (!isPreset) {
      items.push({
        label: (settings.mode === 'time' ? current + 's' : String(current)) + ' ✎',
        active: true,
        onClick: () => openCustomLimit()
      });
    } else {
      items.push({ label: 'custom ✎', active: false, onClick: () => openCustomLimit() });
    }
    left.appendChild(chipGroup(items, settings.mode === 'time' ? 'TIME' : 'WORDS'));
    bar.appendChild(left);

    const right = document.createElement('div');
    right.className = 'mode-bar__right';

    const langWrap = document.createElement('div');
    langWrap.className = 'chip-group';
    langWrap.innerHTML = '<span class="chip-group__label">LANG</span>';
    const langSel = document.createElement('select');
    langSel.className = 'chip-select';
    langSel.setAttribute('aria-label', 'Language');
    TypingData.languages.forEach((l) => {
      const o = document.createElement('option');
      o.value = l.code; o.textContent = l.label;
      if (settings.language === l.code) o.selected = true;
      langSel.appendChild(o);
    });
    langSel.addEventListener('change', () => { settings.language = langSel.value; persistSettings(); newTest(); });
    langWrap.appendChild(langSel);
    right.appendChild(langWrap);

    const settingsBtn = document.createElement('button');
    settingsBtn.className = 'mode-bar__settings-btn';
    settingsBtn.setAttribute('aria-label', 'Open settings');
    settingsBtn.title = 'More settings';
    settingsBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>';
    settingsBtn.addEventListener('click', () => togglePanel('settings-panel'));
    right.appendChild(settingsBtn);

    bar.appendChild(right);
  }

  function chipGroup(items, label) {
    const g = document.createElement('div');
    g.className = 'chip-group';
    if (label) {
      const l = document.createElement('span');
      l.className = 'chip-group__label';
      l.textContent = label;
      g.appendChild(l);
    }
    items.forEach((it) => {
      const b = document.createElement('button');
      b.className = 'chip' + (it.active ? ' active' : '');
      b.textContent = it.label;
      b.addEventListener('click', it.onClick);
      g.appendChild(b);
    });
    return g;
  }

  function setMode(mode) {
    if (settings.mode === mode) return;
    settings.mode = mode;
    // carry over sensible defaults
    if (mode === 'time' && TIME_PRESETS.indexOf(settings.timeLimit) === -1) settings.timeLimit = 30;
    if (mode === 'words' && WORD_PRESETS.indexOf(settings.wordLimit) === -1) settings.wordLimit = 25;
    persistSettings();
    newTest();
  }

  function setLimit(v) {
    if (settings.mode === 'time') settings.timeLimit = v;
    else settings.wordLimit = v;
    persistSettings();
    newTest();
  }

  function openCustomLimit() {
    const raw = window.prompt(
      settings.mode === 'time'
        ? 'Custom time in seconds (5–600):'
        : 'Custom word count (5–500):',
      String(limitValue())
    );
    if (raw == null) return;
    const n = parseInt(raw, 10);
    if (!isFinite(n)) return;
    const clamped = settings.mode === 'time'
      ? Math.max(5, Math.min(600, n))
      : Math.max(5, Math.min(500, n));
    setLimit(clamped);
  }

  function setContent(v) {
    settings.content = v;
    persistSettings();
    if (v === 'custom' && !settings.customText.trim()) {
      openSettings();
      $('settings-content').scrollIntoView({ block: 'center' });
      return;
    }
    newTest();
  }

  function setComplexity(v) {
    if (v !== 'easy' && v !== 'complex') return;
    settings.complexity = v;
    if (v === 'easy') { settings.difficulty = 'beginner'; settings.punctuation = false; settings.uppercase = false; }
    else { settings.difficulty = 'advanced'; settings.punctuation = true; }
    persistSettings();
    syncSettingsPanelToggles();
    newTest();
  }

  function startDailyChallenge() {
    // Deterministic seed from the date → same passage for everyone that day
    const d = new Date();
    const key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const seed = TypingData.hashString('sa-daily-' + key);
    const rng = TypingData.mulberry32(seed);

    settings.mode = 'time';
    settings.timeLimit = 60;
    settings.content = 'sentences';
    settings.language = 'en';
    settings.difficulty = 'advanced';
    persistSettings();

    const text = TypingData.generateText({
      mode: 'time', limit: 60, content: 'sentences',
      language: 'en', difficulty: 'advanced'
    }, rng);

    engine.reset({
      mode: 'time', limit: 60, text: text,
      meta: {
        content: 'sentences', language: 'en', difficulty: 'advanced',
        practice: false, daily: true, dailyKey: key, targetWpm: prefs.targetWpm || 0
      }
    });
    result = null;
    inputLocked = false;
    lastTypedLen = 0;
    renderText();
    renderModeChips();
    showView('test');
    clearResultPanels();
    const badge = $('daily-badge');
    if (badge) badge.classList.add('visible');
    focusInput(true);
    onEngineUpdate(engine.liveStats());
  }

  function persistSettings() {
    TypingHistory.saveSettings(settings);
  }
  function persistPrefs() {
    TypingHistory.savePrefs(prefs);
  }

  /* ======================================================================
     Chrome: buttons, panels, views
     ====================================================================== */

  function bindChrome() {
    $('btn-settings').addEventListener('click', () => togglePanel('settings-panel'));
    $('btn-history').addEventListener('click', () => { togglePanel('history-panel'); if ($('history-panel').classList.contains('open')) renderHistory(); });
    $('btn-help').addEventListener('click', showHelp);
    $('btn-fullscreen').addEventListener('click', toggleFullscreen);

    $('settings-close').addEventListener('click', () => closePanel('settings-panel'));
    $('history-close').addEventListener('click', () => closePanel('history-panel'));
    $('help-close').addEventListener('click', hideHelp);
    $('help-overlay').addEventListener('click', (e) => { if (e.target === $('help-overlay')) hideHelp(); });
    const scrimEl = $('tt-scrim');
    if (scrimEl) {
      scrimEl.addEventListener('click', () => { closePanel('settings-panel'); closePanel('history-panel'); });
    }
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && TypingCharts._hideTip) TypingCharts._hideTip();
    });

    // Focus mode
    $('btn-focus').addEventListener('click', () => {
      prefs.focusMode = !prefs.focusMode;
      persistPrefs();
      applyPrefsToUI();
    });

    document.addEventListener('fullscreenchange', () => {
      document.body.classList.toggle('is-fullscreen', !!document.fullscreenElement);
    });
  }

  function togglePanel(id) {
    const el = $(id);
    const scrim = $('tt-scrim');
    const isOpen = el.classList.contains('open');
    closePanel('settings-panel');
    closePanel('history-panel');
    if (!isOpen) {
      el.classList.add('open');
      if (scrim) scrim.classList.add('open');
      el.setAttribute('aria-hidden', 'false');
      if (id === 'history-panel') renderHistory();
      const focusable = el.querySelector('button, select, input, textarea');
      if (focusable) focusable.focus();
    } else {
      if (scrim) scrim.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    }
  }

  function closePanel(id) {
    const el = $(id);
    const scrim = $('tt-scrim');
    if (el) {
      el.classList.remove('open');
      el.setAttribute('aria-hidden', 'true');
    }
    // If both panels are now closed, hide the scrim
    if (!document.getElementById('settings-panel').classList.contains('open') &&
        !document.getElementById('history-panel').classList.contains('open')) {
      if (scrim) scrim.classList.remove('open');
    }
  }

  function focusResultsRestartButton() {
    const btn = $('results-retry');
    if (!btn) return;
    requestAnimationFrame(() => requestAnimationFrame(() => btn.focus({ preventScroll: true })));
    const hint = document.getElementById('results-restart-hint');
    if (hint) hint.style.display = '';
  }

  function showView(name) {
    currentView = name;
    $('view-test').classList.toggle('visible', name === 'test');
    $('view-results').classList.toggle('visible', name === 'results');
    if (name === 'test') {
      $('view-results').classList.remove('visible');
      $('view-test').classList.add('visible');
    }
    if (name === 'results') focusResultsRestartButton();
  }

  function toggleFullscreen() {
    const target = $('typing-stage');
    if (!document.fullscreenElement) {
      if (target.requestFullscreen) target.requestFullscreen().catch(() => {});
    } else if (document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function bindTestControls() {
    const recordClose = document.getElementById('record-close');
    if (recordClose) {
      recordClose.addEventListener('click', () => {
        const toast = document.getElementById('record-toast');
        if (toast) { toast.classList.remove('is-visible'); setTimeout(() => { toast.hidden = true; }, 180); }
      });
    }
    document.getElementById('record-toast')?.addEventListener('click', (e) => {
      if (e.target === e.currentTarget) {
        e.currentTarget.classList.remove('is-visible');
        setTimeout(() => { e.currentTarget.hidden = true; }, 180);
      }
    });
    $('btn-restart').addEventListener('click', requestRestart);
    $('btn-new-text').addEventListener('click', () => newTest());
    const liveToggle = $('live-stats-toggle');
    if (liveToggle) {
      liveToggle.addEventListener('click', () => {
        liveStatsVisible = !liveStatsVisible;
        prefs.showLiveStats = liveStatsVisible;
        persistPrefs();
        const el = $('live-stats');
        if (el) {
          el.classList.toggle('live-stats--expanded', liveStatsVisible);
          el.setAttribute('aria-expanded', String(liveStatsVisible));
        }
        liveToggle.classList.toggle('is-active', liveStatsVisible);
      });
    }
    $('btn-pause').addEventListener('click', () => {
      const st = engine.getState();
      if (st === 'running') {
        engine.pause();
        $('pause-overlay').classList.add('open');
        $('typing-input').blur();
      } else if (st === 'paused') {
        $('pause-overlay').classList.remove('open');
        engine.resume();
        focusInput(true);
      }
    });
    $('pause-resume').addEventListener('click', () => {
      $('pause-overlay').classList.remove('open');
      engine.resume();
      focusInput(true);
    });
    // Clicking the typing area resumes
    $('typing-viewport').addEventListener('click', () => {
      if (engine.getState() === 'paused') {
        $('pause-overlay').classList.remove('open');
        engine.resume();
      }
      focusInput(true);
    });
  }

  /* ======================================================================
     Settings panel
     ====================================================================== */

  function buildSettingsUI() {
    // Guard: only bind event listeners once to avoid duplicates on rebuild
    const alreadyBound = $('set-sound').dataset.bound === '1';

    // Sound toggle
    $('set-sound').checked = !!prefs.sound;
    if (!alreadyBound) {
      $('set-sound').dataset.bound = '1';
      $('set-sound').addEventListener('change', (e) => {
        prefs.sound = e.target.checked;
        persistPrefs();
      });
    }

    // Countdown
    $('set-countdown').checked = !!settings.countdown;
    if (!alreadyBound) {
      $('set-countdown').addEventListener('change', (e) => {
        settings.countdown = e.target.checked;
        persistSettings();
      });
    }

    // Caret style
    const caretSel = $('set-caret');
    caretSel.value = prefs.caret;
    if (!alreadyBound) {
      caretSel.addEventListener('change', () => {
        prefs.caret = caretSel.value;
        persistPrefs();
        applyPrefsToUI();
      });
    }

    // Font size
    const fontRange = $('set-fontsize');
    fontRange.value = prefs.fontSize;
    if (!alreadyBound) {
      fontRange.addEventListener('input', () => {
        prefs.fontSize = parseFloat(fontRange.value);
        persistPrefs();
        applyPrefsToUI();
      });
    }

    // Width
    const widthRange = $('set-width');
    widthRange.value = prefs.width;
    if (!alreadyBound) {
      widthRange.addEventListener('input', () => {
        prefs.width = parseInt(widthRange.value, 10);
        persistPrefs();
        applyPrefsToUI();
      });
    }

    // Target WPM
    const targetInput = $('set-target');
    targetInput.value = prefs.targetWpm || '';
    if (!alreadyBound) {
      targetInput.addEventListener('change', () => {
        const n = parseInt(targetInput.value, 10);
        prefs.targetWpm = isFinite(n) && n > 0 ? Math.min(400, n) : 0;
        persistPrefs();
      });
    }

    // Custom text
    const customArea = $('set-custom-text');
    customArea.value = settings.customText || '';
    if (!alreadyBound) {
      customArea.addEventListener('change', () => {
        settings.customText = TypingData.cleanCustomText(customArea.value);
        persistSettings();
      });
      $('set-custom-apply').addEventListener('click', () => {
        settings.customText = TypingData.cleanCustomText(customArea.value);
        settings.content = 'custom';
        persistSettings();
        closePanel('settings-panel');
        newTest();
      });
    }

    const easyBtn = $('set-complexity-easy');
    const complexBtn = $('set-complexity-complex');
    if (easyBtn && complexBtn) {
      easyBtn.classList.toggle('is-active', settings.complexity === 'easy');
      complexBtn.classList.toggle('is-active', settings.complexity === 'complex');
      if (!alreadyBound) {
        const applyComplexity = (v) => {
          if (v !== 'easy' && v !== 'complex') return;
          setComplexity(v);
          easyBtn.classList.toggle('is-active', v === 'easy');
          complexBtn.classList.toggle('is-active', v === 'complex');
        };
        easyBtn.addEventListener('click', () => applyComplexity('easy'));
        complexBtn.addEventListener('click', () => applyComplexity('complex'));
      }
    }

    const setContentSel = $('set-content');
    const setDiffSel = $('set-difficulty');
    const setLangSel = $('set-language');
    const setUpperChk = $('set-uppercase');
    const setPunctChk = $('set-punct');
    const setPracticeBtn = $('set-practice-toggle');
    const setDailyBtn = $('set-daily-toggle');
    if (setContentSel) {
      setContentSel.value = settings.content;
      if (!alreadyBound) {
        setContentSel.addEventListener('change', () => {
          if (!setContentSel.value) return;
          setContent(setContentSel.value);
          closePanel('settings-panel');
          setContentSel.value = settings.content;
          if (setDiffSel) setDiffSel.value = settings.difficulty;
          if (setLangSel) setLangSel.value = settings.language;
          syncSettingsPanelToggles();
        });
      }
    }
    if (setDiffSel) {
      setDiffSel.value = settings.difficulty;
      if (!alreadyBound) {
        setDiffSel.addEventListener('change', () => {
          settings.difficulty = setDiffSel.value;
          persistSettings();
          closePanel('settings-panel');
          renderModeChips();
          newTest();
        });
      }
    }
    if (setLangSel) {
      setLangSel.value = settings.language;
      if (!alreadyBound) {
        setLangSel.addEventListener('change', () => {
          settings.language = setLangSel.value;
          persistSettings();
          closePanel('settings-panel');
          renderModeChips();
          newTest();
        });
      }
    }
    if (setUpperChk) {
      setUpperChk.checked = !!settings.uppercase;
      if (!alreadyBound) {
        setUpperChk.addEventListener('change', () => {
          settings.uppercase = setUpperChk.checked;
          persistSettings();
          closePanel('settings-panel');
          newTest();
        });
      }
    }
    if (setPunctChk) {
      setPunctChk.checked = !!settings.punctuation;
      if (!alreadyBound) {
        setPunctChk.addEventListener('change', () => {
          settings.punctuation = setPunctChk.checked;
          persistSettings();
          closePanel('settings-panel');
          newTest();
        });
      }
    }
    if (setPracticeBtn && !alreadyBound) {
      setPracticeBtn.addEventListener('click', () => {
        const cfg = engine.getConfig();
        const p = !!(cfg.meta && cfg.meta.practice);
        closePanel('settings-panel');
        newTest({ practice: !p });
        syncSettingsPanelToggles();
      });
    }
    if (setDailyBtn && !alreadyBound) {
      setDailyBtn.addEventListener('click', () => {
        closePanel('settings-panel');
        startDailyChallenge();
      });
    }
    syncSettingsPanelToggles();
    bindSettingsReset();
  }

  function syncSettingsPanelToggles() {
    const setContentSel = $('set-content');
    const setDiffSel = $('set-difficulty');
    const setLangSel = $('set-language');
    const setUpperChk = $('set-uppercase');
    const setPunctChk = $('set-punct');
    const easyBtn = $('set-complexity-easy');
    const complexBtn = $('set-complexity-complex');
    if (setContentSel) setContentSel.value = settings.content;
    if (setDiffSel) setDiffSel.value = settings.difficulty;
    if (setLangSel) setLangSel.value = settings.language;
    if (setUpperChk) setUpperChk.checked = !!settings.uppercase;
    if (setPunctChk) setPunctChk.checked = !!settings.punctuation;
    if (easyBtn && complexBtn) {
      const c = settings.complexity === 'complex' ? 'complex' : 'easy';
      easyBtn.classList.toggle('is-active', c === 'easy');
      complexBtn.classList.toggle('is-active', c === 'complex');
    }
  }

  function applyPrefsToUI() {
    const root = document.documentElement;
    root.style.setProperty('--tt-font-size', prefs.fontSize + 'rem');
    root.style.setProperty('--tt-width', prefs.width + 'px');
    root.setAttribute('data-caret', prefs.caret);
    document.body.classList.toggle('focus-mode', !!prefs.focusMode);
    $('btn-focus').classList.toggle('active', !!prefs.focusMode);
    $('set-sound').checked = !!prefs.sound;
    $('set-caret').value = prefs.caret;
    $('set-fontsize').value = prefs.fontSize;
    $('set-width').value = prefs.width;
    const liveStatsEl = $('live-stats');
    if (liveStatsEl) {
      liveStatsEl.classList.toggle('live-stats--expanded', liveStatsVisible);
      liveStatsEl.setAttribute('aria-expanded', String(liveStatsVisible));
    }
    const dot = $('live-stats-toggle');
    if (dot) dot.classList.toggle('is-active', liveStatsVisible);
  }

  /* ======================================================================
     Help
     ====================================================================== */

  function showHelp() {
    $('help-overlay').classList.add('open');
    $('help-close').focus();
  }
  function hideHelp() {
    $('help-overlay').classList.remove('open');
    prefs.helpSeen = true;
    persistPrefs();
    focusInput(true);
  }

  /* ======================================================================
     Sounds (WebAudio, no assets)
     ====================================================================== */

  function ensureAudio() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      try { audioCtx = new AC(); } catch (e) { return null; }
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {});
    return audioCtx;
  }

  function playTone(freq, dur, type, gainVal) {
    const ctx = ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(gainVal || 0.04, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur);
  }

  function playSound(kind) {
    if (!prefs.sound) return;
    if (prefs.reducedMotion && (kind === 'finish')) return;
    switch (kind) {
      case 'key': playTone(1180, 0.03, 'sine', 0.03); break;
      case 'error': playTone(220, 0.07, 'square', 0.022); break;
      case 'tick': playTone(720, 0.05, 'sine', 0.03); break;
      case 'soft': playTone(520, 0.05, 'sine', 0.02); break;
      case 'finish': playTone(880, 0.12, 'sine', 0.04); setTimeout(() => playTone(1320, 0.18, 'sine', 0.035), 110); break;
      default: break;
    }
  }

  /* ======================================================================
     Results dashboard
     ====================================================================== */

  function clearResultPanels() {
    $('daily-badge').classList.remove('visible');
    const rec = document.getElementById('record-toast');
    if (rec) { rec.hidden = true; rec.classList.remove('is-visible'); }
  }

  function maybeCelebrateRecord(res, statsBefore) {
    if (!res || !statsBefore) return;
    if (res.validation && res.validation.isInvalid) return;
    if (res.meta && res.meta.practice) return;
    const prevBest = statsBefore.bestWpm || 0;
    if (prevBest <= 0) return;
    if (res.wpm <= prevBest + 0.05) return;
    const toast = document.getElementById('record-toast');
    const wpmEl = document.getElementById('record-wpm');
    const msgEl = document.getElementById('record-msg');
    const confetti = document.getElementById('record-confetti');
    if (!toast || !wpmEl || !confetti) return;
    wpmEl.textContent = String(Math.round(res.wpm));
    if (msgEl) msgEl.textContent = 'You beat your previous best of ' + Math.round(prevBest) + ' WPM — incredible!';
    confetti.innerHTML = '';
    for (let i = 0; i < 18; i++) {
      const piece = document.createElement('span');
      piece.className = 'confetti-piece';
      piece.style.setProperty('--x', (Math.random() * 100).toFixed(1) + '%');
      piece.style.setProperty('--d', (0.9 + Math.random() * 0.9).toFixed(2) + 's');
      piece.style.setProperty('--r', (Math.random() * 720 - 360).toFixed(0) + 'deg');
      confetti.appendChild(piece);
    }
    toast.hidden = false;
    requestAnimationFrame(() => toast.classList.add('is-visible'));
    playSound('finish');
    setTimeout(() => {
      if (!toast.hidden) toast.classList.remove('is-visible');
    }, 5200);
  }

  function validationBadge(validation) {
    if (!validation || validation.reason === 'ok') return '';
    if (validation.reason === 'afk') {
      return '<span class="result-badge result-badge--afk" title="A long idle gap was detected — result may not reflect focused typing. Not counted toward personal bests.">AFK · Invalid</span>';
    }
    if (validation.reason === 'invalid_accuracy') {
      return '<span class="result-badge result-badge--invalid" title="Accuracy is far below a meaningful practice range — likely random typing. Not counted toward personal bests.">Invalid Accuracy</span>';
    }
    if (validation.reason === 'low_accuracy') {
      return '<span class="result-badge result-badge--warn">Low Accuracy</span>';
    }
    return '';
  }

  function renderResults(res) {
    const meta = res.meta || {};
    const validation = res.validation || null;

    // Capture stats BEFORE this result was added so we can detect new personal bests.
    // Note: onEngineFinish already called TypingHistory.add(res), so we need to
    // compute what stats looked like excluding the just-added result.
    const allRecords = TypingHistory.all();
    const recordsBeforeThis = allRecords.filter((r) => r.id !== res.id && r.finishedAt !== res.finishedAt);
    const statsBefore = TypingHistory.stats(recordsBeforeThis);

    // Mode badge line
    const modeTxt = res.mode === 'time' ? res.limit + ' seconds' : res.limit + ' words';
    const contentTxt = meta.content + ' · ' + meta.language.toUpperCase() + ' · ' + meta.difficulty;
    $('result-mode').innerHTML = modeTxt + ' · ' + contentTxt + (meta.practice ? ' · practice' : '') + (meta.daily ? ' · daily challenge' : '') + ' ' + validationBadge(validation);

    // Validity note (honest: never show misleading numbers as if they were normal)
    const validityEl = $('result-validity');
    if (validityEl) {
      if (validation && validation.isAfk) {
        validityEl.textContent = 'Detected as AFK — you were inactive for ' + Math.round((validation.maxGapMs || validation.idleMs) / 1000) + 's. WPM and accuracy below are computed accurately from your actual keystrokes, but this result was not saved to your history.';
        validityEl.classList.add('visible');
      } else if (validation && validation.reason === 'invalid_accuracy') {
        validityEl.textContent = 'Flagged as Invalid Accuracy — error rate was too high to be meaningful practice. Metrics below are accurate, but not saved.';
        validityEl.classList.add('visible');
      } else {
        validityEl.textContent = '';
        validityEl.classList.remove('visible');
      }
    }

    // Big numbers — animated count-up reveal
    const animateCount = (id, target, suffix) => {
      const el = $(id);
      if (!el) return;
      if (prefs.reducedMotion) { el.textContent = target + (suffix || ''); return; }
      const num = parseFloat(target);
      const isInt = String(target).indexOf('.') === -1 && suffix !== '%';
      const duration = 520;
      const t0 = performance.now();
      const start = 0;
      const step = (now) => {
        const p = Math.min(1, (now - t0) / duration);
        const e = 1 - Math.pow(1 - p, 3);
        const v = start + (num - start) * e;
        el.textContent = (isInt ? String(Math.round(v)) : v.toFixed(1)) + (suffix || '');
        if (p < 1) requestAnimationFrame(step);
        else el.textContent = target + (suffix || '');
      };
      requestAnimationFrame(step);
    };

    animateCount('result-wpm', String(Math.round(res.wpm)), '');
    animateCount('result-raw', String(Math.round(res.rawWpm)), '');
    $('result-acc').textContent = '';
    animateCount('result-acc', res.accuracy.toFixed(1), '%');
    $('result-consistency').textContent = '';
    animateCount('result-consistency', String(Math.round(res.consistency)), '%');

    // Consistency gets a soft invalidation when AFK/invalid
    const wpmEl = $('result-wpm');
    const accEl = $('result-acc');
    const consEl = $('result-consistency');
    const invalid = !!(validation && validation.isInvalid);
    [wpmEl, accEl, consEl].forEach((el) => { if (el) el.classList.toggle('is-invalid', invalid); });

    // Secondary stats
    $('result-correct').textContent = res.correct;
    $('result-incorrect').textContent = res.incorrect;
    $('result-extra').textContent = res.extra;
    $('result-missed').textContent = res.missed;
    $('result-errorrate').textContent = res.errorRate.toFixed(1) + '%';
    $('result-duration').textContent = formatTime(res.durationMs);
    $('result-corrected').textContent = res.correctedErrors;
    $('result-uncorrected').textContent = res.uncorrectedErrors;
    $('result-chars').textContent = res.correct + res.incorrect + res.extra + res.missed;

    const breakdownEl = $('result-breakdown');
    if (breakdownEl) {
      const items = [
        ['correct', res.correct, 'var(--tt-correct)'],
        ['incorrect', res.incorrect, 'var(--tt-incorrect)'],
        ['extra', res.extra, 'var(--tt-extra)'],
        ['missed', res.missed, '#7e796f']
      ].filter(([, v]) => v > 0);
      breakdownEl.innerHTML = items.map(([label, value, col]) =>
        '<span class="result-breakdown__chip"><span class="result-breakdown__dot" style="background:' + col + '"></span>' + value + ' ' + label + '</span>'
      ).join('');
      breakdownEl.classList.toggle('visible', items.length > 0);
    }

    const wpmSub = $('result-wpm-sub');
    const accSub = $('result-acc-sub');
    const rawSub = $('result-raw-sub');
    const consSub = $('result-consistency-sub');
    if (wpmSub) {
      const sk = res.skippedWords > 0 ? ' · ' + res.skippedWords + ' word' + (res.skippedWords === 1 ? '' : 's') + ' skipped' : '';
      wpmSub.textContent = 'net · ' + (res.totalKeystrokes ? Math.round((res.correct / Math.max(1, res.correct + res.incorrect + res.extra)) * 100) + '% of typed' + sk : sk ? sk.slice(3) : '—');
    }
    if (accSub) {
      const sk = res.skippedWords > 0 ? ' · ' + res.skippedWords + ' skipped' : '';
      accSub.textContent = res.totalKeystrokes + ' keystrokes · ' + res.errorRate.toFixed(1) + '% errors' + sk;
    }
    if (rawSub) rawSub.textContent = 'incl. errors & extras';
    if (consSub) consSub.textContent = res.consistency < 30 ? 'unsteady' : (res.consistency < 70 ? 'moderate' : 'steady');

    // Personal comparison (history excludes invalid)
    const stats = TypingHistory.stats();
    renderComparison(res, stats, validation);

    // Suggestions
    renderSuggestions(res);

    // Passage review + frequent errors + virtual keyboard
    renderPassageReview(res);
    renderFrequentErrors(res);
    renderVirtualKeyboard(res);

    showView('results');
    focusResultsRestartButton();
    updatePersonalBestUI();
    if (statsBefore.count > 0) maybeCelebrateRecord(res, statsBefore);
    // Defer chart paint until the results view is laid out — prevents
    // the classic "display:none reports width 0 → blurry canvas" bug.
    requestAnimationFrame(() => requestAnimationFrame(() => renderResultCharts()));
  }

  function renderComparison(res, stats, validation) {
    const box = $('result-compare');
    if (!stats.count) {
      box.innerHTML = '<span class="compare-note">First recorded test — future results will be compared against this baseline.</span>';
      if (validation && validation.isInvalid) {
        box.insertAdjacentHTML('beforeend', '<span class="compare-note" style="color:var(--accent)">This result was not counted due to its validation flag.</span>');
      }
      return;
    }
    const dwpm = Math.round((res.wpm - stats.avgWpm) * 10) / 10;
    const dacc = Math.round((res.accuracy - stats.avgAccuracy) * 10) / 10;
    const dbest = Math.round((res.wpm - stats.bestWpm) * 10) / 10;
    box.innerHTML = `
      <span class="compare-item ${dwpm >= 0 ? 'up' : 'down'}">
        <span class="compare-item__label">vs avg WPM (${stats.avgWpm})</span>
        <span class="compare-item__value">${dwpm >= 0 ? '+' : ''}${dwpm}</span>
      </span>
      <span class="compare-item ${dacc >= 0 ? 'up' : 'down'}">
        <span class="compare-item__label">vs avg accuracy (${stats.avgAccuracy}%)</span>
        <span class="compare-item__value">${dacc >= 0 ? '+' : ''}${dacc}</span>
      </span>
      <span class="compare-item ${dbest >= 0 ? 'up' : 'down'}">
        <span class="compare-item__label">vs best WPM (${stats.bestWpm})</span>
        <span class="compare-item__value">${dbest >= 0 ? '+' : ''}${dbest}</span>
      </span>
    `;
    if (validation && validation.isInvalid) {
      box.insertAdjacentHTML('beforeend', '<span class="compare-note" style="color:var(--accent)">Not counted toward averages/personal bests.</span>');
    }
  }

  function renderSuggestions(res) {
    const tips = [];
    if (res.accuracy < 92) {
      tips.push('Accuracy is the cheapest speed gain: slow down ~10% next run and push accuracy above 95%.');
    }
    if (res.rawWpm - res.wpm > 8) {
      tips.push('Large gap between raw and net speed (' + Math.round(res.rawWpm - res.wpm) + ' WPM) \u2014 errors are costly. Type deliberately, not reactively.');
    }
    if (res.consistency < 70) {
      tips.push('Consistency is low (' + Math.round(res.consistency) + '%). Try pacing yourself with an even rhythm instead of fast bursts.');
    }
    if (res.frequentErrors.length) {
      const chars = res.frequentErrors.slice(0, 5).map((e) => '\u201C' + e.char + '\u201D').join(', ');
      tips.push('Most missed characters: ' + chars + '. A few minutes of focused practice on these keys will pay off.');
    }
    if (res.missed > res.correct * 0.2 && res.reason === 'time') {
      tips.push('You left ' + res.missed + ' characters untyped \u2014 skim one word ahead to avoid pauses at word boundaries.');
    }
    if (res.wpm >= (res.meta && res.meta.targetWpm || 0) && res.meta && res.meta.targetWpm) {
      tips.push('Target of ' + res.meta.targetWpm + ' WPM reached. Consider raising it by 5 WPM.');
    }
    if (!tips.length) {
      tips.push('Solid run. Keep practicing regularly — short daily sessions beat occasional long ones.');
    }
    const el = $('result-suggestions');
    el.innerHTML = tips.map((t) => '<li>' + escapeHtml(t) + '</li>').join('');
  }

  function renderPassageReview(res) {
    const wrap = $('review-text');
    wrap.innerHTML = '';
    const text = res.text || '';
    const typed = res.typed || '';
    const frag = document.createDocumentFragment();
    const comparable = Math.min(typed.length, text.length);

    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      const span = document.createElement('span');
      span.className = 'rv-char';
      if (ch === '\n') { span.classList.add('rv-newline'); span.textContent = ''; }
      else { span.textContent = ch; }

      if (i < comparable) {
        span.classList.add(typed[i] === ch ? 'rv-correct' : 'rv-incorrect');
        if (typed[i] !== ch) span.title = 'typed &quot;' + printable(typed[i]) + '&quot;';
      } else if (i >= typed.length) {
        span.classList.add('rv-missed');
      }
      frag.appendChild(span);
    }
    // Extra chars beyond target
    if (typed.length > text.length) {
      const extra = document.createElement('span');
      extra.className = 'rv-char rv-extra';
      extra.textContent = typed.slice(text.length);
      frag.appendChild(extra);
    }
    wrap.appendChild(frag);
  }

  function renderFrequentErrors(res) {
    const el = $('frequent-errors');
    if (!res.frequentErrors || !res.frequentErrors.length) {
      el.innerHTML = '<span class="compare-note">No uncorrected errors — excellent.</span>';
      return;
    }
    const max = res.frequentErrors[0].count;
    el.innerHTML = res.frequentErrors.map((e) => `
      <div class="freq-row">
        <span class="freq-char">${escapeHtml(printable(e.char))}</span>
        <div class="freq-bar"><div class="freq-bar__fill" style="width:${Math.round((e.count / max) * 100)}%"></div></div>
        <span class="freq-count">${e.count}×</span>
      </div>
    `).join('');
  }

  function renderVirtualKeyboard(res) {
    const wrap = $('virtual-keyboard');
    const errors = {};
    (res.frequentErrors || []).forEach((e) => { errors[e.char] = e.count; });
    // Build error map from full uncorrected set
    const text = res.text || '';
    const typed = res.typed || '';
    const comparable = Math.min(typed.length, text.length);
    const fullErrors = {};
    for (let i = 0; i < comparable; i++) {
      if (typed[i] !== text[i]) {
        const ch = text[i];
        fullErrors[ch] = (fullErrors[ch] || 0) + 1;
      }
    }
    const maxErr = Math.max(1, ...Object.values(fullErrors));

    const rows = [
      ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
      ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
      ['z', 'x', 'c', 'v', 'b', 'n', 'm'],
      ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
    ];
    wrap.innerHTML = rows.map((row) => `
      <div class="vk-row">
        ${row.map((k) => {
          const count = fullErrors[k] || 0;
          const intensity = count / maxErr;
          return `<span class="vk-key${count ? ' has-errors' : ''}"${count ? ' style="--heat:' + intensity.toFixed(2) + '" title="' + count + ' errors on \u201C' + k + '\u201D"' : ''}>${k}${count ? '<sup>' + count + '</sup>' : ''}</span>`;
        }).join('')}
      </div>
    `).join('');
  }

  function renderResultCharts() {
    if (!result) return;
    let samples = (result.samples || []).slice();
    const colors = TypingCharts.themeColors();

    if (!samples.length) {
      samples.push({
        t: Math.round(result.durationMs / 1000),
        wpm: result.wpm, rawWpm: result.rawWpm,
        accuracy: result.accuracy, errors: result.incorrectKeystrokes
      });
    }

    const unifiedCanvas = $('chart-unified');
    if (unifiedCanvas) {
      TypingCharts.autoRender(unifiedCanvas, () => {
        TypingCharts.unifiedPerformanceChart(unifiedCanvas, samples, { animate: true });
      });
    }

    // Tiny inline stats row beneath the unified graph
    const inlineEl = $('result-stats-inline');
    if (inlineEl) {
      inlineEl.innerHTML =
        '<span><strong>' + Math.round(result.wpm) + '</strong> WPM</span>' +
        '<span><strong>' + result.accuracy.toFixed(1) + '%</strong> acc</span>' +
        '<span><strong>' + Math.round(result.consistency) + '%</strong> consistency</span>' +
        '<span class="muted">' + result.correct + ' ✓ · ' + result.incorrect + ' ✕ · ' + result.extra + ' extra · ' + result.missed + ' missed</span>';
    }

    const breakdownCanvas = $('chart-breakdown');
    if (breakdownCanvas) {
      TypingCharts.autoRender(breakdownCanvas, () => {
        TypingCharts.doughnutChart(breakdownCanvas, {
          segments: [
            { label: 'correct', value: result.correct, color: colors.correct },
            { label: 'incorrect', value: result.incorrect, color: colors.incorrect },
            { label: 'extra', value: result.extra, color: colors.extra },
            { label: 'missed', value: result.missed, color: colors.missed }
          ],
          centerLabel: result.correct + result.incorrect + result.extra + result.missed,
          centerSub: 'chars'
        });
      });
    }
  }

  /* ======================================================================
     History dashboard
     ====================================================================== */

  function bindHistoryUI() {
    $('hist-mode').addEventListener('change', (e) => { historyFilter.mode = e.target.value; renderHistory(); });
    $('hist-limit').addEventListener('change', (e) => { historyFilter.limit = e.target.value; renderHistory(); });
    $('hist-content').addEventListener('change', (e) => { historyFilter.content = e.target.value; renderHistory(); });
    $('hist-period').addEventListener('change', (e) => { historyFilter.period = e.target.value; renderHistory(); });
    $('hist-export-json').addEventListener('click', () => {
      TypingHistory.download('typing-history.json', TypingHistory.exportJSON(), 'application/json');
    });
    $('hist-export-csv').addEventListener('click', () => {
      TypingHistory.download('typing-history.csv', TypingHistory.exportCSV(), 'text/csv');
    });
    $('hist-clear').addEventListener('click', () => {
      if (!window.confirm('Delete ALL typing history? This cannot be undone.')) return;
      TypingHistory.clear();
      renderHistory();
    });
    $('hist-clear-filters').addEventListener('click', () => {
      historyFilter = { mode: 'all', limit: 'all', content: 'all', period: 'day' };
      $('hist-mode').value = 'all';
      $('hist-limit').value = 'all';
      $('hist-content').value = 'all';
      $('hist-period').value = 'day';
      renderHistory();
    });
    $('results-new-test').addEventListener('click', () => newTest());
    $('results-retry').addEventListener('click', () => newTest());
    $('results-view-history').addEventListener('click', () => { togglePanel('history-panel'); });
    $('results-practice').addEventListener('click', () => newTest({ practice: true }));
    $('results-share').addEventListener('click', shareResults);
  }

  function renderHistory() {
    const records = TypingHistory.filter(historyFilter);
    const stats = TypingHistory.stats(records);

    $('hist-best-wpm').textContent = stats.bestWpm || '—';
    $('hist-best-acc').textContent = stats.bestAccuracy ? stats.bestAccuracy + '%' : '—';
    $('hist-avg-wpm').textContent = stats.avgWpm || '—';
    $('hist-avg-acc').textContent = stats.avgAccuracy ? stats.avgAccuracy + '%' : '—';
    $('hist-count').textContent = stats.count;
    $('hist-improvement').textContent = stats.count >= 3
      ? (stats.improvement >= 0 ? '+' : '') + stats.improvement + ' WPM'
      : '—';
    updatePersonalBestUI();

    // Progress chart over time (chronological)
    const chrono = records.slice().sort((a, b) => a.finishedAt - b.finishedAt);
    const colors = TypingCharts.themeColors();
    TypingCharts.autoRender($('chart-progress'), () => {
      TypingCharts.lineChart($('chart-progress'), {
        labels: chrono.map((r) => shortDate(r.finishedAt)),
        series: [
          { name: 'WPM', color: colors.accent, data: chrono.map((r) => r.wpm), fill: true },
          { name: 'Accuracy', color: colors.correct, data: chrono.map((r) => r.accuracy / 5), width: 1.5, dash: [3, 3] }
        ],
        fmtY: (v) => Math.round(v)
      });
    });

    // Period averages
    const grouped = TypingHistory.groupByPeriod(records, historyFilter.period);
    TypingCharts.autoRender($('chart-period'), () => {
      TypingCharts.barChart($('chart-period'), {
        data: grouped.slice(-24).map((g) => ({ label: g.key.slice(5), value: g.avgWpm, color: colors.accent }))
      });
    });

    // List
    const list = $('history-list');
    if (!records.length) {
      list.innerHTML = '<div class="history-empty">No tests recorded yet. Complete a test to start your history — it is stored only in this browser.</div>';
      return;
    }
    list.innerHTML = records.slice(0, 120).map((r) => `
      <div class="history-row" data-id="${r.id}">
        <div class="history-row__meta">
          <span class="history-row__date">${shortDate(r.finishedAt)} ${shortTime(r.finishedAt)}</span>
          <div class="history-row__badges">
            <span class="history-row__badge">${r.mode === 'time' ? r.limit + 's' : r.limit + 'w'}</span>
            <span class="history-row__badge">${escapeHtml(r.meta.content)}</span>
            ${r.meta.practice ? '<span class="history-row__badge history-row__badge--practice">practice</span>' : ''}
            ${r.meta.daily ? '<span class="history-row__badge history-row__badge--daily">daily</span>' : ''}
          </div>
        </div>
        <div class="history-row__stats">
          <span class="history-row__wpm" title="WPM">${Math.round(r.wpm)} <span style="font-size:0.6rem;opacity:.6;font-weight:400">WPM</span></span>
          <span class="history-row__acc" title="Accuracy">${r.accuracy.toFixed(1)}%</span>
          <span class="history-row__cons" title="Consistency">${Math.round(r.consistency)}%</span>
        </div>
        <button class="history-row__delete tt-icon-btn" title="Delete this result" aria-label="Delete result from ${shortDate(r.finishedAt)}">✕</button>
      </div>
    `).join('');

    $$('.history-row__delete', list).forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const row = btn.closest('.history-row');
        const id = row.getAttribute('data-id');
        row.classList.add('removing');
        setTimeout(() => {
          TypingHistory.remove(id);
          renderHistory();
        }, prefs.reducedMotion ? 0 : 180);
      });
    });
  }

  function updatePersonalBestUI() {
    const el = document.getElementById('personal-best');
    const wpmEl = document.getElementById('pb-wpm');
    const accEl = document.getElementById('pb-acc');
    const metaEl = document.getElementById('personal-best-meta');
    if (!el || !wpmEl || !accEl) return;
    const stats = TypingHistory.stats();
    if (!stats.count) { el.hidden = true; return; }
    el.hidden = false;
    wpmEl.textContent = String(Math.round(stats.bestWpm));
    accEl.textContent = stats.bestAccuracy.toFixed(1) + '%';
    if (metaEl) metaEl.textContent = stats.count + ' saved tests · avg ' + stats.avgWpm + ' WPM';
    if (result && result.validation && result.validation.isInvalid) {
      wpmEl.style.opacity = '0.55';
      accEl.style.opacity = '0.55';
    } else {
      wpmEl.style.opacity = '';
      accEl.style.opacity = '';
    }
  }

  function shareResults() {
    if (!result) return;
    const r = result;
    const txt = 'Typing Speed Test — ' + Math.round(r.wpm) + ' WPM · ' + r.accuracy.toFixed(1) + '% acc · ' +
      (r.mode === 'time' ? r.limit + 's' : r.limit + ' words') + ' · consistency ' + Math.round(r.consistency) + '%' +
      (r.meta && r.meta.daily ? ' · daily challenge' : '');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(txt).then(() => {
        const btn = $('results-share');
        const old = btn.textContent;
        btn.textContent = 'Copied!';
        setTimeout(() => { btn.textContent = old; }, 1800);
      }).catch(() => window.prompt('Copy your result:', txt));
    } else {
      window.prompt('Copy your result:', txt);
    }
  }

  /* ======================================================================
     Small utilities
     ====================================================================== */

  function shortDate(ts) {
    const d = new Date(ts);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }
  function shortTime(ts) {
    const d = new Date(ts);
    return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  function printable(ch) {
    if (ch === ' ') return '&#9251;';
    if (ch === '\n') return '&#9166;';
    return escapeHtml(ch);
  }
  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }

  /* Public hook for debugging / tests */
  return { init, syncCaret, _state: () => ({ settings, prefs, engine, result }) };
})();

/* ---- Yellow blinking caret (independent of the typing engine) ---- */
(function () {
  function placeCaret() {
    if (window.TypingApp && window.TypingApp.syncCaret) window.TypingApp.syncCaret();
  }
  ['input', 'keydown', 'keyup', 'click', 'focusin'].forEach(function (ev) {
    document.addEventListener(ev, function () { requestAnimationFrame(placeCaret); }, true);
  });
  setInterval(placeCaret, 500);
})();
