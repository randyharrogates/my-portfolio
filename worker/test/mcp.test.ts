import assert from "node:assert/strict";
import { test } from "node:test";
import { handleMcp } from "../src/mcp.ts";
import { byId, corpus, index } from "./fixtures.ts";

const deps = { index, byId, version: "test" };
const rpc = (method: string, params?: unknown, id: unknown = 1) => handleMcp({ jsonrpc: "2.0", id, method, ...(params ? { params } : {}) }, deps);
const body = (r: { body: unknown }) => r.body as { result?: any; error?: { code: number } };

test("mcp: initialize answers with a protocol version the client asked for, and offers tools only", () => {
  const r = body(rpc("initialize", { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "t", version: "1" } }));
  assert.equal(r.result.protocolVersion, "2025-03-26");
  assert.deepEqual(Object.keys(r.result.capabilities), ["tools"]);
  assert.equal(body(rpc("initialize", { protocolVersion: "1999-01-01" })).result.protocolVersion, "2025-06-18");
});

test("mcp: a notification is accepted with no reply", () => {
  assert.deepEqual(handleMcp({ jsonrpc: "2.0", method: "notifications/initialized" }, deps), { status: 202, body: null });
});

test("mcp: tools/list publishes the two read-only tools with their schemas", () => {
  const tools = body(rpc("tools/list")).result.tools;
  assert.deepEqual(tools.map((t: { name: string }) => t.name), ["search_portfolio", "get_excerpt"]);
  for (const t of tools) assert.ok(t.inputSchema.type === "object" && t.annotations.readOnlyHint === true);
});

test("mcp: search_portfolio returns excerpts from the corpus, and get_excerpt returns the same text by id", () => {
  const found = JSON.parse(body(rpc("tools/call", { name: "search_portfolio", arguments: { query: "LangGraph multi-agent orchestration" } })).result.content[0].text);
  assert.ok(found.length > 0 && found.length <= 8);
  for (const hit of found) assert.ok(byId.get(hit.id)?.text === hit.text && hit.url.startsWith("https://randyharrogates.github.io/my-portfolio/"));
  const one = JSON.parse(body(rpc("tools/call", { name: "get_excerpt", arguments: { id: found[0].id } })).result.content[0].text);
  assert.deepEqual(one, found[0]);
});

test("mcp: bad input is a tool error or a protocol error, never a crash", () => {
  const call = (name: string, args: unknown) => body(rpc("tools/call", { name, arguments: args }));
  assert.equal(call("search_portfolio", { query: "" }).result.isError, true);
  assert.equal(call("search_portfolio", { query: "x".repeat(201) }).result.isError, true);
  assert.equal(call("search_portfolio", "not an object").result.isError, true);
  assert.equal(call("get_excerpt", { id: "../../etc/passwd" }).result.isError, true);
  assert.equal(call("get_excerpt", { id: "__proto__" }).result.isError, true);
  assert.equal(call("run_report", {}).error?.code, -32602);
  assert.equal(body(rpc("resources/list")).error?.code, -32601);
  for (const bad of [null, [], "x", { jsonrpc: "1.0", method: "ping", id: 1 }, [{ jsonrpc: "2.0", method: "ping", id: 1 }]]) assert.equal(handleMcp(bad, deps).status, 400);
});

test("mcp: nothing outside the published corpus can be reached", () => {
  const all = JSON.stringify(corpus.chunks);
  const text = body(rpc("tools/call", { name: "search_portfolio", arguments: { query: "phone address NRIC salary password" } })).result.content[0].text;
  if (text.startsWith("[")) for (const hit of JSON.parse(text)) assert.ok(all.includes(JSON.stringify(hit.text)));
});
