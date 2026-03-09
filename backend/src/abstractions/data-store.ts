export interface ApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  type: "admin" | "client";
  created_at: string;
  revoked_at: string | null;
}

export interface NewApiKey {
  id: string;
  key_hash: string;
  key_prefix: string;
  type: "admin" | "client";
}

export interface DataStore {
  findKeyByHash(hash: string): Promise<ApiKey | null>;
  findKeyById(id: string): Promise<ApiKey | null>;
  createKey(key: NewApiKey): Promise<void>;
  listKeys(): Promise<ApiKey[]>;
  revokeKey(id: string): Promise<void>;

  getSetting(key: string): Promise<string | null>;
  setSetting(key: string, value: string): Promise<void>;
}
