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
});
