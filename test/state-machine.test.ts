import test from "node:test";
import assert from "node:assert/strict";
import { assertTransition, canTransition } from "../src/core/state-machine.js";

test("allows normal collaboration flow", () => {
  assert.equal(canTransition("PLANNING", "IMPLEMENTING"), true);
  assert.equal(canTransition("IMPLEMENTING", "TESTING"), true);
  assert.equal(canTransition("TESTING", "REVIEWING"), true);
  assert.equal(canTransition("REVIEWING", "OPEN_PR"), true);
  assert.equal(canTransition("OPEN_PR", "WAITING_HUMAN_APPROVAL"), true);
  assert.equal(canTransition("WAITING_HUMAN_APPROVAL", "MERGING"), true);
  assert.equal(canTransition("MERGING", "COMPLETED"), true);
});

test("rejects unsafe transition", () => {
  assert.throws(() => assertTransition("PLANNING", "COMPLETED"), /Invalid task transition/);
});