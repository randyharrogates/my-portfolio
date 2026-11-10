import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyBudget, remaining, reserve, settle } from "../src/budget.ts";
import { begin, emptyLimits, end } from "../src/limits.ts";
import { hashIp, issueVisitorToken, verifyVisitorToken } from "../src/visitor.ts";

const T0 = Date.UTC(2026, 10, 10, 12, 0, 0);
const cfg = { monthlyMicro: 10_000_000, dailyMicro: 330_000 };

test("a reservation counts against the cap until it is settled at actual cost", () => {
  const s = emptyBudget(T0);
  const r = reserve(s, cfg, 5_000, T0);
  assert.ok(r.ok);
  assert.equal(remaining(s, cfg, T0).day, 325_000);
  settle(s, r.id, 1_200, T0);
  assert.equal(remaining(s, cfg, T0).day, 328_800);
  assert.equal(s.monthSpent, 1_200);
});

test("the daily cap refuses a call that would cross it, counting calls still in flight", () => {
  const s = emptyBudget(T0);
  const a = reserve(s, cfg, 200_000, T0);
  const b = reserve(s, cfg, 130_000, T0);
  assert.ok(a.ok && b.ok, "exactly at the cap is allowed");
  assert.deepEqual(reserve(s, cfg, 1, T0), { ok: false, reason: "daily" });
});

test("the monthly cap is hard: spend can never be reserved past it", () => {
  const s = emptyBudget(T0);
  const big = { monthlyMicro: 10_000_000, dailyMicro: 10_000_000 };
  let spent = 0;
  for (let i = 0; i < 5000; i++) {
    const r = reserve(s, big, 4_100, T0);
    if (!r.ok) {
      assert.equal(r.reason, "monthly");
      break;
    }
    settle(s, r.id, 4_100, T0);
    spent += 4_100;
  }
  assert.ok(spent <= 10_000_000);
  assert.ok(spent > 10_000_000 - 4_100, "stops only when the next call would not fit");
});

test("the day resets at UTC midnight and the month on the 1st; the month does not reset daily", () => {
  const s = emptyBudget(T0);
  const r = reserve(s, cfg, 330_000, T0);
  assert.ok(r.ok);
  settle(s, r.id, 330_000, T0);
  assert.equal(reserve(s, cfg, 1, T0).ok, false);
  const tomorrow = T0 + 24 * 3600_000;
  assert.equal(reserve(s, cfg, 1, tomorrow).ok, true);
  assert.equal(s.monthSpent, 330_000);
  const december = Date.UTC(2026, 11, 1, 0, 0, 1);
  assert.equal(remaining(s, cfg, december).month, 10_000_000, "a new month starts with the full budget");
});

test("a reservation that is never settled is counted as fully spent, not forgotten", () => {
  const s = emptyBudget(T0);
  assert.ok(reserve(s, cfg, 50_000, T0).ok);
  remaining(s, cfg, T0 + 6 * 60_000);
  assert.equal(s.daySpent, 50_000);
  assert.deepEqual(s.reserved, {});
});

test("settling twice or settling an unknown id changes nothing", () => {
  const s = emptyBudget(T0);
  const r = reserve(s, cfg, 1_000, T0);
  assert.ok(r.ok);
  settle(s, r.id, 700, T0);
  settle(s, r.id, 700, T0);
  settle(s, "r999", 700, T0);
  assert.equal(s.daySpent, 700);
});

const lim = { runsPerDay: 5, burstMs: 10_000, inflightMs: 120_000 };

test("a visitor gets 5 runs a day, counted under both the visitor id and the IP", () => {
  const s = emptyLimits(T0);
  let t = T0;
  for (let i = 0; i < 5; i++) {
    const b = begin(s, lim, ["v:a", "ip:x"], t);
    assert.ok(b.ok, `run ${i + 1}`);
    assert.equal(b.runsLeft, 4 - i);
    end(s, ["v:a", "ip:x"]);
    t += 11_000;
  }
  const sixth = begin(s, lim, ["v:a", "ip:x"], t);
  assert.ok(!sixth.ok && sixth.reason === "daily");
  // a fresh visitor id from the same IP is still refused, and so is the same id from a new IP
  assert.equal(begin(s, lim, ["v:new", "ip:x"], t).ok, false);
  assert.equal(begin(s, lim, ["v:a", "ip:other"], t).ok, false);
  // a different visitor on a different IP is unaffected
  assert.equal(begin(s, lim, ["v:b", "ip:y"], t).ok, true);
  // next UTC day
  assert.equal(begin(s, lim, ["v:a", "ip:x"], T0 + 24 * 3600_000).ok, true);
});

test("a second run start within 10 seconds is refused as a burst and does not use up a run", () => {
  const s = emptyLimits(T0);
  assert.ok(begin(s, lim, ["v:a", "ip:x"], T0).ok);
  end(s, ["v:a", "ip:x"]);
  const again = begin(s, lim, ["v:a", "ip:x"], T0 + 3_000);
  assert.deepEqual(again, { ok: false, reason: "burst", retryAfterSec: 7 });
  assert.equal(s.runs["v:a"], 1);
  assert.ok(begin(s, lim, ["v:a", "ip:x"], T0 + 10_001).ok);
});

test("one run at a time per visitor; a run that never ends stops blocking after two minutes", () => {
  const s = emptyLimits(T0);
  assert.ok(begin(s, lim, ["v:a", "ip:x"], T0).ok);
  const busy = begin(s, lim, ["v:a", "ip:x"], T0 + 20_000);
  assert.ok(!busy.ok && busy.reason === "busy");
  assert.ok(begin(s, lim, ["v:a", "ip:x"], T0 + 121_000).ok);
});

test("visitor tokens verify only when signed with the Worker's secret", async () => {
  const { id, token } = await issueVisitorToken("secret-one");
  assert.equal(await verifyVisitorToken("secret-one", token), id);
  assert.equal(await verifyVisitorToken("secret-two", token), null);
  assert.equal(await verifyVisitorToken("secret-one", token.slice(0, -2) + "xx"), null);
  assert.equal(await verifyVisitorToken("secret-one", `${id}.`), null);
  assert.equal(await verifyVisitorToken("secret-one", null), null);
  assert.equal(await verifyVisitorToken("secret-one", "a".repeat(500)), null);
});

test("the IP is stored only as a daily-salted hash", async () => {
  const a = await hashIp("s", "203.0.113.7", "2026-11-10");
  assert.equal(a, await hashIp("s", "203.0.113.7", "2026-11-10"));
  assert.notEqual(a, await hashIp("s", "203.0.113.7", "2026-11-11"));
  assert.notEqual(a, await hashIp("s", "203.0.113.8", "2026-11-10"));
  assert.ok(!a.includes("203"));
});
