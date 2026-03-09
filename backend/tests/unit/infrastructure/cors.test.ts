import { describe, it, expect } from "vitest";
import {
  handlePreflight,
  addCorsHeaders,
} from "../../../src/infrastructure/cors.js";

describe("handlePreflight()", () => {
  it("returns a 204 response", () => {
    const response = handlePreflight();

    expect(response.status).toBe(204);
  });

  it("sets Access-Control-Allow-Origin to https://enki.cr", () => {
    const response = handlePreflight();

    expect(response.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://enki.cr",
    );
  });

  it("sets Access-Control-Allow-Methods with expected methods", () => {
    const response = handlePreflight();

    expect(response.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS",
    );
  });

  it("sets Access-Control-Allow-Headers with Authorization and Content-Type", () => {
    const response = handlePreflight();

    expect(response.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
  });
});

describe("addCorsHeaders()", () => {
  it("preserves the original response body and status", async () => {
    const original = new Response(JSON.stringify({ ok: true }), {
      status: 200,
    });

    const result = addCorsHeaders(original);

    expect(result.status).toBe(200);
    const body = await result.json();
    expect(body).toEqual({ ok: true });
  });

  it("adds CORS headers to the response", () => {
    const original = new Response("hello", { status: 201 });

    const result = addCorsHeaders(original);

    expect(result.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://enki.cr",
    );
    expect(result.headers.get("Access-Control-Allow-Methods")).toBe(
      "GET, POST, PUT, DELETE, OPTIONS",
    );
    expect(result.headers.get("Access-Control-Allow-Headers")).toBe(
      "Authorization, Content-Type",
    );
  });
});
