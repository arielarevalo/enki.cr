import { describe, it, expect, vi } from "vitest";
import {
  authenticate,
  hashKey,
  type KeyLookup,
  type AuthResult,
} from "../../../src/infrastructure/auth.js";

function createMockKeyLookup(): KeyLookup {
  return {
    findByHash: vi.fn(),
  };
}

describe("authenticate()", () => {
  it("returns 401 when Authorization header is missing", async () => {
    const lookup = createMockKeyLookup();
    const request = new Request("https://example.com", {
      headers: {},
    });

    const result = await authenticate(request, lookup, ["client"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 when Authorization header does not start with Bearer", async () => {
    const lookup = createMockKeyLookup();
    const request = new Request("https://example.com", {
      headers: { Authorization: "Basic abc123" },
    });

    const result = await authenticate(request, lookup, ["client"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns 401 when bearer token does not match any key", async () => {
    const lookup = createMockKeyLookup();
    vi.mocked(lookup.findByHash).mockResolvedValue(null);
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer enki_cli_invalidkey" },
    });

    const result = await authenticate(request, lookup, ["client"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(401);
  });

  it("returns 403 when key type does not match required types", async () => {
    const lookup = createMockKeyLookup();
    vi.mocked(lookup.findByHash).mockResolvedValue({
      id: "key-1",
      type: "client",
    });
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer enki_cli_somekey" },
    });

    const result = await authenticate(request, lookup, ["admin"]);

    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(403);
  });

  it("returns AuthResult when key is valid and type matches", async () => {
    const lookup = createMockKeyLookup();
    const authenticatedKey = { id: "key-1", type: "client" as const };
    vi.mocked(lookup.findByHash).mockResolvedValue(authenticatedKey);
    const request = new Request("https://example.com", {
      headers: { Authorization: "Bearer enki_cli_validkey" },
    });

    const result = await authenticate(request, lookup, ["client"]);

    expect(result).not.toBeInstanceOf(Response);
    expect((result as AuthResult).key).toEqual(authenticatedKey);
  });
});

describe("hashKey()", () => {
  it("produces consistent results for the same input", async () => {
    const hash1 = await hashKey("test-key");
    const hash2 = await hashKey("test-key");

    expect(hash1).toBe(hash2);
  });

  it("produces different results for different inputs", async () => {
    const hash1 = await hashKey("key-one");
    const hash2 = await hashKey("key-two");

    expect(hash1).not.toBe(hash2);
  });
});
