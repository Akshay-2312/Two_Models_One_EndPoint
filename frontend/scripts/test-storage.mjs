import assert from "node:assert/strict";
import { readStored, writeStored, removeStored } from "../lib/storage.ts";

// The helpers must never throw: a blocked or full store is a normal browser
// condition, not an application error.

// 1. Server render: no window at all.
delete globalThis.window;
assert.equal(readStored("session", "k"), null);
assert.equal(writeStored("session", "k", "1"), false);
assert.doesNotThrow(() => removeStored("local", "k"));

// 2. The storage getter itself throws (blocked third-party context, policy).
const opened = [];
globalThis.window = {
  get sessionStorage() {
    opened.push("session");
    throw new Error("SecurityError");
  },
  get localStorage() {
    opened.push("local");
    throw new Error("SecurityError");
  },
};
assert.equal(readStored("session", "k"), null);
assert.equal(writeStored("local", "k", "1"), false);
assert.doesNotThrow(() => removeStored("session", "k"));
assert.deepEqual(opened, ["session", "local", "session"]);

// 3. The store exists but every operation throws (quota, enterprise policy).
const calls = [];
const hostile = {
  getItem() {
    calls.push("get");
    throw new Error("SecurityError");
  },
  setItem() {
    calls.push("set");
    throw new Error("QuotaExceededError");
  },
  removeItem() {
    calls.push("remove");
    throw new Error("SecurityError");
  },
};
globalThis.window = { sessionStorage: hostile, localStorage: hostile };
assert.equal(readStored("session", "k"), null);
assert.equal(writeStored("session", "k", "1"), false);
assert.doesNotThrow(() => removeStored("local", "k"));
assert.deepEqual(calls, ["get", "set", "remove"]);

// 4. A working store round-trips through the helpers.
let kept = null;
const working = {
  getItem: () => kept,
  setItem: (_key, value) => {
    kept = value;
  },
  removeItem: () => {
    kept = null;
  },
};
globalThis.window = { sessionStorage: working, localStorage: working };
assert.equal(writeStored("local", "k", "v"), true);
assert.equal(readStored("local", "k"), "v");
removeStored("local", "k");
assert.equal(readStored("local", "k"), null);

delete globalThis.window;
console.log("Storage contract tests passed.");
