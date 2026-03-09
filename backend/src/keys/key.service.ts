import { hashKey } from "../infrastructure/auth.js";
import { NotFoundError, ValidationError } from "../shared/errors.js";
import type { KeyRepository } from "./key-repository.js";
import type { ApiKey } from "./key.types.js";

export interface CreatedKey {
  id: string;
  rawKey: string;
  type: "client";
  createdAt: string;
}

export class KeyService {
  constructor(private repo: KeyRepository) {}

  async create(): Promise<CreatedKey> {
    const randomBytes = crypto.getRandomValues(new Uint8Array(16));
    const hexStr = Array.from(randomBytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    const rawKey = `enki_cli_${hexStr}`;
    const id = crypto.randomUUID();
    const keyHash = await hashKey(rawKey);
    const createdAt = new Date().toISOString();

    await this.repo.create({
      id,
      keyHash,
      keyPrefix: "enki_cli_",
      type: "client",
    });

    return { id, rawKey, type: "client", createdAt };
  }

  async list(): Promise<ApiKey[]> {
    return this.repo.list();
  }

  async revoke(id: string): Promise<void> {
    const key = await this.repo.findById(id);
    if (!key) {
      throw new NotFoundError("Key not found");
    }
    if (key.revokedAt) {
      throw new ValidationError("Key is already revoked");
    }
    await this.repo.revoke(id);
  }
}
