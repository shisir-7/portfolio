window.TypingEngine = (function () {
  'use strict';

  const CHAR_LIMIT = 20000;        
  const EXTRA_CHAR_CAP = 50;       
  const KEYLOG_CAP = 5000;         

  const DEFAULT_CONFIG = {
    mode: 'time',          
    limit: 30,             
    text: '',
    stopOnError: false,    
    meta: {}               
  };

  function createEngine(userConfig) {
    const config = Object.assign({}, DEFAULT_CONFIG, userConfig || {});

    
    let text = '';                 
    let typed = '';                
    let state = 'idle';            
    let startAt = 0;               
    let endAt = 0;
    let pausedAt = 0;              
    let totalPausedMs = 0;

    let totalKeystrokes = 0;       
    let correctKeystrokes = 0;
    let incorrectKeystrokes = 0;
    let backspaces = 0;
    let deletedErrors = 0;         
    let skippedWords = 0;
    let lastKeystrokeAt = 0;       
    let afkGaps = [];              

    let keystrokeLog = [];         
    let perSecondSamples = [];     
    let lastSampleSecond = -1;
    let errorsThisSecond = 0;
    let keystrokesThisSecond = 0;
    let correctKeystrokesThisSecond = 0;

    let listeners = { update: [], finish: [], state: [] };

    

    function now() { return performance.now(); }

    function elapsedMs(atTime) {
      if (state === 'idle') return 0;
      const end = state === 'finished' ? endAt : (atTime || now());
      if (state === 'paused') return pausedAt - startAt - totalPausedMs;
      return end - startAt - totalPausedMs;
    }

    function isTimeUp(atTime) {
      return config.mode === 'time' && elapsedMs(atTime) >= config.limit * 1000;
    }

    function isTextComplete() {
      return typed.length >= text.length;
    }

    function shouldFinish() {
      if (state !== 'running') return false;
      return isTimeUp() || isTextComplete();
    }

    function charStats() {
      const comparable = Math.min(typed.length, text.length);
      let correct = 0;
      let incorrect = 0;
      for (let i = 0; i < comparable; i++) {
        if (typed[i] === text[i]) correct++;
        else incorrect++;
      }
      const extra = Math.max(0, typed.length - text.length);
      const missed = Math.max(0, text.length - typed.length);
      return { correct, incorrect, extra, missed, comparable };
    }

    function computeAccuracy() {
      if (totalKeystrokes === 0) return 100;
      return (correctKeystrokes / totalKeystrokes) * 100;
    }

    function clamp(n, lo, hi) {
      if (!isFinite(n)) return 0;
      return n < lo ? lo : n > hi ? hi : n;
    }

    function computeWpm(nowMs) {
      const ms = elapsedMs(nowMs);
      if (ms < 220) return { wpm: 0, rawWpm: 0 };
      const minutes = ms / 60000;
      if (minutes <= 0) return { wpm: 0, rawWpm: 0 };
      const s = charStats();
      const netRaw = (s.correct / 5) / minutes;
      const rawRaw = ((s.correct + s.incorrect + s.extra) / 5) / minutes;
      const net = clamp(Math.round(netRaw * 10) / 10, 0, 400);
      const raw = clamp(Math.round(rawRaw * 10) / 10, 0, 400);
      if (Math.abs(net) > 350 || Math.abs(raw) > 350 || !isFinite(net) || !isFinite(raw)) {
        return { wpm: clamp(net, 0, 350), rawWpm: clamp(raw, 0, 350) };
      }
      return { wpm: net, rawWpm: raw };
    }

    function computeConsistency(samples) {
      const raws = (samples || perSecondSamples).map((s) => s.rawWpm).filter((v) => v > 0);
      if (raws.length < 2) return 100;
      const mean = raws.reduce((a, b) => a + b, 0) / raws.length;
      if (mean === 0) return 0;
      const variance = raws.reduce((acc, v) => acc + (v - mean) * (v - mean), 0) / raws.length;
      const cv = Math.sqrt(variance) / mean;
      return Math.max(0, Math.min(100, Math.round((1 - cv) * 1000) / 10));
    }

    function snapshotForCharts() {
      const s = charStats();
      let { wpm, rawWpm } = computeWpm();
      const acc = clamp(Math.round(computeAccuracy() * 10) / 10, 0, 100);
      const ms = elapsedMs();
      const rawClamped = clamp(rawWpm, 0, 400);
      const wpmClamped = clamp(wpm, 0, 400);
      if (ms < 220) {
        wpm = 0; rawWpm = 0;
      } else {
        wpm = wpmClamped; rawWpm = rawClamped;
      }
      if (!isFinite(wpm) || !isFinite(rawWpm) || !isFinite(acc)) {
        wpm = 0; rawWpm = 0;
      }
      return {
        t: Math.round(elapsedMs() / 1000),
        wpm,
        rawWpm,
        correct: s.correct,
        incorrect: s.incorrect,
        errors: errorsThisSecond,
        totalErrors: incorrectKeystrokes,
        keystrokes: keystrokesThisSecond,
        accuracy: acc
      };
    }

    function sampleSecondIfDue() {
      const sec = Math.floor(elapsedMs() / 1000);
      
      while (lastSampleSecond < sec) {
        lastSampleSecond++;
        const snap = snapshotForCharts();
        snap.t = lastSampleSecond;
        perSecondSamples.push(snap);
        
        errorsThisSecond = 0;
        keystrokesThisSecond = 0;
        correctKeystrokesThisSecond = 0;
      }
    }

    function emit(name, payload) {
      (listeners[name] || []).forEach((fn) => {
        try { fn(payload); } catch (e) {  }
      });
    }

    function liveStats() {
      const s = charStats();
      const { wpm, rawWpm } = computeWpm();
      const acc = computeAccuracy();
      const remaining = config.mode === 'time'
        ? Math.max(0, config.limit - Math.floor(elapsedMs() / 1000))
        : Math.max(0, text.length - typed.length);
      return {
        state,
        mode: config.mode,
        limit: config.limit,
        meta: config.meta,
        elapsedMs: elapsedMs(),
        remaining,
        wpm,
        rawWpm,
        accuracy: Math.round(acc * 100) / 100,
        errorRate: Math.round((100 - acc) * 100) / 100,
        correct: s.correct,
        incorrect: s.incorrect,
        extra: s.extra,
        missed: s.missed,
        skippedWords,
        typedLength: typed.length,
        textLength: text.length,
        progress: config.mode === 'words'
          ? (text.length ? Math.min(1, typed.length / text.length) : 0)
          : Math.min(1, elapsedMs() / (config.limit * 1000)),
        totalKeystrokes,
        correctKeystrokes,
        incorrectKeystrokes
      };
    }

    

    function start() {
      if (state !== 'idle') return false;
      if (!text || !text.trim()) return false;
      state = 'running';
      startAt = now();
      lastSampleSecond = -1;
      emit('state', state);
      emit('update', liveStats());
      return true;
    }

    function pause() {
      if (state !== 'running') return false;
      state = 'paused';
      pausedAt = now();
      emit('state', state);
      emit('update', liveStats());
      return true;
    }

    function resume() {
      if (state !== 'paused') return false;
      totalPausedMs += now() - pausedAt;
      state = 'running';
      emit('state', state);
      emit('update', liveStats());
      return true;
    }

    function finish(reason) {
      if (state === 'finished' || state === 'idle') return null;
      if (state === 'paused') {
        
        
        totalPausedMs += now() - pausedAt;
      }
      state = 'finished';
      endAt = now();
      
      sampleSecondIfDue();

      const s = charStats();
      
      
      const activeSeconds = elapsedMs() / 1000;
      const reliable = activeSeconds >= 0.5 && totalKeystrokes >= 3;
      const minutes = elapsedMs() / 60000;
      const net = (reliable && minutes > 0) ? (s.correct / 5) / minutes : 0;
      const raw = (reliable && minutes > 0) ? ((s.correct + s.incorrect + s.extra) / 5) / minutes : 0;
      const acc = computeAccuracy();
      
      const corrected = Math.max(0, Math.min(incorrectKeystrokes, deletedErrors));
      const uncorrected = s.incorrect + s.extra;

      const validation = computeValidation(s, acc, activeSeconds, reliable);

      
      const missedCharMap = {};
      const comparable = Math.min(typed.length, text.length);
      for (let i = 0; i < comparable; i++) {
        if (typed[i] !== text[i]) {
          const ch = text[i] === ' ' ? '␠' : text[i];
          missedCharMap[ch] = (missedCharMap[ch] || 0) + 1;
        }
      }
      const frequentErrors = Object.keys(missedCharMap)
        .map((ch) => ({ char: ch, count: missedCharMap[ch] }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 12);

      const result = {
        version: 1,
        id: 'r_' + Math.random().toString(36).slice(2) + '_' + Date.now(),
        finishedAt: Date.now(),
        reason: reason || (config.mode === 'time' ? 'time' : 'complete'),
        mode: config.mode,
        limit: config.limit,
        meta: Object.assign({}, config.meta),
        durationMs: Math.round(elapsedMs()),
        wpm: Math.round(Math.min(400, Math.max(0, net)) * 10) / 10,
        rawWpm: Math.round(Math.min(400, Math.max(0, raw)) * 10) / 10,
        accuracy: Math.round(acc * 100) / 100,
        errorRate: Math.round((100 - acc) * 100) / 100,
        consistency: computeConsistency(),
        correct: s.correct,
        incorrect: s.incorrect,
        extra: s.extra,
        missed: s.missed,
        skippedWords,
        totalKeystrokes,
        correctKeystrokes,
        incorrectKeystrokes,
        backspaces,
        correctedErrors: corrected,
        uncorrectedErrors: uncorrected,
        frequentErrors,
        samples: perSecondSamples.slice(),
        validation,
        
        text,
        typed
      };

      emit('state', state);
      emit('finish', result);
      return result;
    }

    function reset(newConfig) {
      if (newConfig) Object.assign(config, newConfig);
      text = config.text || '';
      if (text.length > CHAR_LIMIT) text = text.slice(0, CHAR_LIMIT);
      typed = '';
      state = 'idle';
      startAt = 0; endAt = 0; pausedAt = 0; totalPausedMs = 0;
      totalKeystrokes = 0; correctKeystrokes = 0; incorrectKeystrokes = 0;
      backspaces = 0; deletedErrors = 0; skippedWords = 0;
      lastKeystrokeAt = 0;
      afkGaps = [];
      keystrokeLog = []; perSecondSamples = [];
      lastSampleSecond = -1;
      errorsThisSecond = 0; keystrokesThisSecond = 0; correctKeystrokesThisSecond = 0;
      emit('state', state);
      emit('update', liveStats());
    }

    

    
    function typeChar(ch) {
      if (state === 'idle') {
        if (!start()) return false;
      }
      if (state !== 'running') return false;
      if (isTimeUp()) { finish('time'); return false; }
      
      if (ch !== '\n' && (ch.charCodeAt(0) < 32 || ch === '\u007f')) return false;
      if (typed.length - text.length >= EXTRA_CHAR_CAP) return false;

      const expected = text[typed.length];
      const correct = expected !== undefined && ch === expected;

      const currentElapsed = Math.round(elapsedMs());
      if (totalKeystrokes > 0) {
        const gap = currentElapsed - lastKeystrokeAt;
        if (gap >= 5000) afkGaps.push(gap);
      }
      lastKeystrokeAt = currentElapsed;

      typed += ch;
      totalKeystrokes++;
      keystrokesThisSecond++;
      if (correct) { correctKeystrokes++; correctKeystrokesThisSecond++; }
      else { incorrectKeystrokes++; errorsThisSecond++; }

      if (keystrokeLog.length < KEYLOG_CAP) {
        keystrokeLog.push({
          t: currentElapsed,
          kind: 'insert',
          expected: expected === undefined ? null : expected,
          actual: ch,
          correct
        });
      }

      sampleSecondIfDue();

      if (shouldFinish()) {
        finish(isTimeUp() ? 'time' : 'complete');
        return true;
      }

      emit('update', liveStats());
      return true;
    }

    
    function backspace(count) {
      if (state !== 'running') return 0;
      if (typed.length === 0) return 0;
      let removed = 0;
      for (let i = 0; i < (count || 1); i++) {
        if (typed.length === 0) break;
        typed = typed.slice(0, typed.length - 1);
        backspaces++;
        removed++;
        if (keystrokeLog.length < KEYLOG_CAP) {
          keystrokeLog.push({ t: Math.round(elapsedMs()), kind: 'delete' });
        }
      }
      if (removed > 0) {
        
        
        recomputeCorrections();
        sampleSecondIfDue();
        emit('update', liveStats());
      }
      return removed;
    }

    
    function recomputeCorrections() {
      let pos = 0;
      let corrected = 0;
      keystrokeLog.forEach((entry) => {
        if (entry.kind === 'delete') { pos = Math.max(0, pos - 1); return; }
        if (!entry.correct) {
          if (pos >= typed.length) {
            corrected++; 
          } else if (typed[pos] !== entry.actual) {
            corrected++; 
          }
        }
        pos++;
      });
      deletedErrors = corrected;
    }

    
    function skipWord() {
      if (state !== 'running') return false;
      const cursor = typed.length;
      if (cursor >= text.length) {
        finish(config.mode === 'time' ? 'time' : 'complete');
        return true;
      }
      if (text[cursor] === ' ') {
        skippedWords++;
        return typeChar(' ');
      }
      const nextSpace = text.indexOf(' ', cursor);
      const target = nextSpace === -1 ? text.length : nextSpace + 1;
      if (target <= cursor) return false;
      let spacesNeeded = 0;
      for (let i = cursor; i < target; i++) {
        const exp = text[i];
        const ch = exp === '\n' ? '\n' : ' ';
        typed += ch;
        totalKeystrokes++;
        spacesNeeded++;
        const expected = exp;
        const correct = expected !== undefined && ch === expected;
        if (correct) { correctKeystrokes++; correctKeystrokesThisSecond++; }
        else { incorrectKeystrokes++; errorsThisSecond++; }
        if (keystrokeLog.length < KEYLOG_CAP) {
          keystrokeLog.push({
            t: Math.round(elapsedMs()),
            kind: 'insert',
            expected: expected === undefined ? null : expected,
            actual: ch,
            correct
          });
        }
      }
      skippedWords++;
      sampleSecondIfDue();
      if (shouldFinish()) { finish(config.mode === 'time' ? 'time' : 'complete'); }
      else emit('update', liveStats());
      return true;
    }

    function currentWordHasError() {
      const cursor = typed.length;
      if (cursor === 0) return false;
      const lastSpace = text.lastIndexOf(' ', cursor - 1);
      const wordStart = lastSpace + 1;
      for (let i = wordStart; i < cursor; i++) {
        if (text[i] !== typed[i]) return true;
      }
      return false;
    }

    
    function syncFromValue(value) {
      if (state === 'finished') return;
      
      let prefix = 0;
      const minLen = Math.min(typed.length, value.length);
      while (prefix < minLen && typed[prefix] === value[prefix]) prefix++;
      
      if (prefix === typed.length && prefix === value.length) return;
      
      if (typed.length > prefix) {
        backspace(typed.length - prefix);
      }
      
      const newSuffix = value.slice(prefix);
      for (let i = 0; i < newSuffix.length; i++) {
        if (!typeChar(newSuffix[i])) break;
      }
    }

    
    function extendText(more) {
      if (!more) return false;
      if (text.length >= CHAR_LIMIT) return false;
      const needsSpace = text.length > 0 && !/\s$/.test(text) && !/^\s/.test(more);
      text = (text + (needsSpace ? ' ' : '') + more).slice(0, CHAR_LIMIT);
      emit('update', liveStats());
      return true;
    }

    function computeValidation(s, acc, activeSeconds, reliable) {
      const expectedLimit = config.mode === 'time' ? config.limit : null;
      const typedAnything = totalKeystrokes > 0;
      const idleAtEnd = expectedLimit !== null && lastKeystrokeAt > 0
        ? (Math.round((endAt - startAt - totalPausedMs)) - lastKeystrokeAt)
        : 0;
      const longAfk = afkGaps.some((g) => g >= 8000) || (typedAnything && idleAtEnd >= 8000);
      const largelyIdle = expectedLimit !== null && reliable === false && totalKeystrokes < 5;
      const sparseTyping = expectedLimit !== null && typedAnything && activeSeconds >= 10
        && (s.correct + s.incorrect + s.extra) < activeSeconds * 0.8;
      const afk = largelyIdle || longAfk || sparseTyping;
      const lowAccuracy = acc < 55 && totalKeystrokes >= 6;
      const extremeInaccuracy = acc < 40 && totalKeystrokes >= 8;
      return {
        isAfk: afk,
        isLowAccuracy: lowAccuracy,
        isExtremeInaccuracy: extremeInaccuracy,
        isInvalid: afk || extremeInaccuracy,
        reason: afk ? 'afk' : (extremeInaccuracy ? 'invalid_accuracy' : (lowAccuracy ? 'low_accuracy' : 'ok')),
        idleMs: Math.max(0, Math.round(idleAtEnd)),
        maxGapMs: afkGaps.length ? Math.max(...afkGaps) : 0,
        gaps: afkGaps.slice(0, 8)
      };
    }

    

    function on(event, fn) {
      if (!listeners[event]) listeners[event] = [];
      listeners[event].push(fn);
      return function off() {
        listeners[event] = listeners[event].filter((f) => f !== fn);
      };
    }

    function destroy() {
      listeners = { update: [], finish: [], state: [] };
    }

    

    reset();

    return {
      
      start, pause, resume, finish, reset, destroy,
      
      typeChar, backspace, syncFromValue, extendText, skipWord,
      
      currentWordHasError,
      
      on,
      getState: () => state,
      getConfig: () => Object.assign({}, config),
      getText: () => text,
      getTyped: () => typed,
      getElapsedMs: () => elapsedMs(),
      liveStats,
      
      _internals: () => ({
        keystrokeLog: keystrokeLog.slice(),
        samples: perSecondSamples.slice(),
        deletedErrors
      })
    };
  }

  return { createEngine, CHAR_LIMIT, EXTRA_CHAR_CAP };
})();
