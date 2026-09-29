import test from "node:test";
import assert from "node:assert/strict";
import { MemoryTaskStore } from "../src/core/store.js";

test("stores tasks and events", async () => {
  const store = new MemoryTaskStore();
  const task = await store.createTask({ objective: "test objective", repository: "acme/demo", baseBranch: "main", testCommand: "npm test" });
  assert.equal(task.state, "PLANNING");
  await store.appendEvent({ taskId: task.id, type: "HELLO", actor: "system", payload: { ok: true }, createdAt: new Date().toISOString() });
  assert.equal((await store.listEvents(task.id)).length, 1);
});