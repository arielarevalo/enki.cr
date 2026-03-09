import { describe, it, expect, vi } from "vitest";
import { KeyService } from "../../../src/keys/key.service.js";
import type { KeyRepository } from "../../../src/keys/key-repository.js";
import type { ApiKey } from "../../../src/keys/key.types.js";
import { NotFoundError, ValidationError } from "../../../src/shared/errors.js";

function createMockRepo(): KeyRepository {
  return {
    findByHash: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    list: vi.fn(),
    revoke: vi.fn(),
  };
}

describe("KeyService", () => {
  describe("create()", () => {
    it("returns a raw key with enki_cli_ prefix, id, type, and createdAt", async () => {
      const repo = createMockRepo();
      const service = new KeyService(repo);

      const result = await service.create();

      expect(result.rawKey).toMatch(/^enki_cli_[0-9a-f]{32}$/);
      expect(result.id).toBeDefined();
      expect(typeof result.id).toBe("string");
      expect(result.type).toBe("client");
      expect(result.createdAt).toBeDefined();
      expect(() => new Date(result.createdAt).toISOString()).not.toThrow();
    });

    it("calls repo.create with a hashed key, not the raw key", async () => {
      const repo = createMockRepo();
      const service = new KeyService(repo);

      const result = await service.create();

      expect(repo.create).toHaveBeenCalledOnce();
      const createArg = vi.mocked(repo.create).mock.calls[0][0];
      expect(createArg.id).toBe(result.id);
      expect(createArg.keyHash).not.toBe(result.rawKey);
      expect(createArg.keyHash).toMatch(/^[0-9a-f]{64}$/);
      expect(createArg.keyPrefix).toBe("enki_cli_");
      expect(createArg.type).toBe("client");
    });
  });

  describe("revoke()", () => {
    it("throws NotFoundError when key does not exist", async () => {
      const repo = createMockRepo();
      vi.mocked(repo.findById).mockResolvedValue(null);
      const service = new KeyService(repo);

      await expect(service.revoke("nonexistent-id")).rejects.toThrow(
        NotFoundError,
      );
    });

    it("throws ValidationError when key is already revoked", async () => {
      const repo = createMockRepo();
      const revokedKey: ApiKey = {
        id: "key-1",
        keyHash: "abc",
        keyPrefix: "enki_cli_",
        type: "client",
        createdAt: "2024-01-01T00:00:00.000Z",
        revokedAt: "2024-06-01T00:00:00.000Z",
      };
      vi.mocked(repo.findById).mockResolvedValue(revokedKey);
      const service = new KeyService(repo);

      await expect(service.revoke("key-1")).rejects.toThrow(ValidationError);
    });

    it("calls repo.revoke when key exists and is not revoked", async () => {
      const repo = createMockRepo();
      const activeKey: ApiKey = {
        id: "key-1",
        keyHash: "abc",
        keyPrefix: "enki_cli_",
        type: "client",
        createdAt: "2024-01-01T00:00:00.000Z",
        revokedAt: null,
      };
      vi.mocked(repo.findById).mockResolvedValue(activeKey);
      const service = new KeyService(repo);

      await service.revoke("key-1");

      expect(repo.revoke).toHaveBeenCalledWith("key-1");
    });
  });

  describe("list()", () => {
    it("delegates to repo.list()", async () => {
      const repo = createMockRepo();
      const keys: ApiKey[] = [
        {
          id: "key-1",
          keyHash: "hash1",
          keyPrefix: "enki_cli_",
          type: "client",
          createdAt: "2024-01-01T00:00:00.000Z",
          revokedAt: null,
        },
      ];
      vi.mocked(repo.list).mockResolvedValue(keys);
      const service = new KeyService(repo);

      const result = await service.list();

      expect(repo.list).toHaveBeenCalledOnce();
      expect(result).toBe(keys);
    });
  });
});
