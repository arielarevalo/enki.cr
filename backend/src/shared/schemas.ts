import { z } from "zod";

export const ErrorSchema = z.object({
  error: z.object({
    type: z.string(),
    message: z.string(),
  }),
});

export const AgentSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
});

export const ApiKeyResponseSchema = z.object({
  id: z.string(),
  prefix: z.string(),
  type: z.enum(["admin", "client"]),
  created_at: z.string(),
  revoked_at: z.string().nullable(),
});
