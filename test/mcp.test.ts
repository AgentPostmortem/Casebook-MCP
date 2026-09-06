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

  it("rejects batches above 100 requests before dispatch", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");
    const requests = Array.from({ length: 101 }, (_, index) => ({
      jsonrpc: "2.0",
      id: index + 1,
      method: "tools/call",
      params: { name: "search_cases", arguments: { query: "refund" } },
    }));

    const response = await handleMcpRequest(postJson(requests));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      jsonrpc: "2.0",
      id: null,
      error: { code: -32600, message: "Invalid Request" },
    });
    expect(fetchSpy).not.toHaveBeenCalled();
    fetchSpy.mockRestore();
  });
});

describe("tools/call argument validation", () => {
  it.each(["refund", 7, true, null, []])(
    "returns Invalid params for non-object arguments: %j",
    async (args) => {
      const response = await handleMcpRequest(
        postJson({
          jsonrpc: "2.0",
          id: 9,
          method: "tools/call",
          params: { name: "search_cases", arguments: args },
        }),
      );

      expect(await response.json()).toEqual({
        jsonrpc: "2.0",
        id: 9,
        error: { code: -32602, message: "Invalid params" },
      });
    },
  );
});
