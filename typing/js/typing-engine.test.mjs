import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const engineSource = readFileSync(new URL("./typing-engine.js", import.meta.url), "utf8");

function createEngineHarness() {
  let now = 0;
  const window = {};
  runInNewContext(engineSource, {
    window,
    performance: { now: () => now }
  });

  return {
    createEngine: window.TypingEngine.createEngine,
    setNow(value) { now = value; }
  };
}

test("a timed test finishes as soon as its finite passage is complete", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "time", limit: 60, text: "abc" });
  let result = null;
  engine.on("finish", value => { result = value; });

  assert.equal(engine.getState(), "idle");
  assert.equal(engine.getElapsedMs(), 0);
  engine.typeChar("a");
  harness.setNow(100);
  engine.typeChar("b");
  harness.setNow(200);
  engine.typeChar("c");

  assert.equal(engine.getState(), "finished");
  assert.equal(result.reason, "complete");
  assert.equal(result.typed, "abc");
  assert.ok(result.durationMs < 60000);
});

test("a timed test still finishes at its time limit before passage completion", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "time", limit: 15, text: "a".repeat(100) });
  let result = null;
  engine.on("finish", value => { result = value; });

  engine.typeChar("a");
  harness.setNow(15000);
  assert.equal(engine.typeChar("a"), false);

  assert.equal(engine.getState(), "finished");
  assert.equal(result.reason, "time");
  assert.equal(result.typed, "a");
});

test("a word-count test finishes when the target text is complete", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "words", limit: 1, text: "a" });
  let result = null;
  engine.on("finish", value => { result = value; });

  engine.typeChar("a");

  assert.equal(engine.getState(), "finished");
  assert.equal(result.reason, "complete");
  assert.ok(typeof result.id === "string" && result.id.startsWith("r_"));
});

test("typing engine result produces an id and respects wpm cap", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "time", limit: 15, text: "hello world" });
  let result = null;
  engine.on("finish", value => { result = value; });

  engine.start();
  harness.setNow(1000);
  result = engine.finish();

  assert.ok(result);
  assert.ok(typeof result.id === "string" && result.id.length > 5);
  assert.ok(result.wpm <= 400);
  assert.ok(result.rawWpm <= 400);
});

test("advances to next word when word typed incorrectly with exact length", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "words", limit: 2, text: "example next" });
  engine.start();

  for (const ch of "exampla") engine.typeChar(ch);

  assert.equal(engine.currentWordHasError(), true);
  assert.equal(engine.getTyped(), "exampla");

  // User presses Space to skip to next word
  const ok = engine.skipWord();
  assert.equal(ok, true);
  assert.equal(engine.getTyped(), "exampla ");
  assert.equal(engine.liveStats().skippedWords, 1);
});

test("incomplete final word finishes test when skipped with Space", () => {
  const harness = createEngineHarness();
  const engine = harness.createEngine({ mode: "words", limit: 2, text: "first example" });
  let result = null;
  engine.on("finish", value => { result = value; });
  engine.start();

  for (const ch of "first exampl") engine.typeChar(ch);

  const ok = engine.skipWord();
  assert.equal(ok, true);
  assert.equal(engine.getState(), "finished");
  assert.equal(result.reason, "complete");
});
