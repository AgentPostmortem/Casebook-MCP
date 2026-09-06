import { describe, expect, it, vi } from "vitest";
import { handleMcpRequest } from "../src/mcp";

function postJson(body: unknown): Request {
  return new Request("https://casebook.test/mcp", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("handleMcpRequest batches", () => {
  it("returns Invalid Request for an empty batch", async () => {
    const response = await handleMcpRequest(postJson([]));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" },
    });
  });

  it("keeps non-empty notification-only batches response-free", async () => {
    const response = await handleMcpRequest(
      postJson([
        { jsonrpc: "2.0", method: "notifications/initialized" },
        { jsonrpc: "2.0", method: "ping" },
      ]),
    );

    expect(response.status).toBe(202);
    expect(await response.text()).toBe("");
  });
});

describe("search_cases input", () => {
  it.each([{}, { query: "" }, { query: "   " }])(
    "rejects a missing or empty query before loading the corpus",
    async (arguments_) => {
      const fetchSpy = vi.spyOn(globalThis, "fetch");

      const response = await handleMcpRequest(
        postJson({
          jsonrpc: "2.0",
          id: 1,
          method: "tools/call",
          params: { name: "search_cases", arguments: arguments_ },
        }),
      );

      const payload = await response.json();
      const fetchCalls = fetchSpy.mock.calls.length;
      fetchSpy.mockRestore();

      expect(payload).toEqual({
        jsonrpc: "2.0",
        id: 1,
        error: { code: -32602, message: "query must be a non-empty string" },
      });
      expect(fetchCalls).toBe(0);
    },
  );
});
