import type { ApiKey, NewApiKey } from "./key.types.js";

export interface KeyRepository {
  findByHash(hash: string): Promise<ApiKey | null>;
  findById(id: string): Promise<ApiKey | null>;
  create(key: NewApiKey): Promise<void>;
  list(): Promise<ApiKey[]>;
  revoke(id: string): Promise<void>;
}
