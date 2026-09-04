import { describe, expect, it } from "vitest";
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
