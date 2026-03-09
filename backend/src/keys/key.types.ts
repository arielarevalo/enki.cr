export interface ApiKey {
  id: string;
  keyHash: string;
  keyPrefix: string;
  type: "admin" | "client";
  createdAt: string;
  revokedAt: string | null;
}

export interface NewApiKey {
  id: string;
  keyHash: string;
  keyPrefix: string;
  type: "admin" | "client";
}
