// Secrets injected via deploy workflow — not declared in wrangler.jsonc vars
// to avoid binding conflicts with wrangler secret:bulk.
interface Env {
  OPENROUTER_API_KEY: string;
}
