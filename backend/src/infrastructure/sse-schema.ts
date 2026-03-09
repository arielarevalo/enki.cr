// Canonical copy also in agents/src/sse/schema.ts. Keep in sync.
import { z } from "zod";

// ── Shared nested objects ──

export const OutputTextPartSchema = z.object({
  type: z.literal("output_text"),
  text: z.string(),
  annotations: z.array(z.unknown()),
});

export const MessageItemSchema = z.object({
  type: z.literal("message"),
  id: z.string(),
  status: z.enum(["in_progress", "completed"]),
  role: z.literal("assistant"),
  content: z.array(OutputTextPartSchema),
});

export const UsageSchema = z.object({
  input_tokens: z.number(),
  output_tokens: z.number(),
  total_tokens: z.number(),
});

export const ResponseObjectSchema = z.object({
  id: z.string(),
  object: z.literal("response"),
  created_at: z.number(),
  status: z.enum(["in_progress", "completed"]),
  model: z.string(),
  output: z.array(MessageItemSchema),
  usage: UsageSchema.nullable(),
});

// ── Event schemas ──

export const ResponseCreatedEventSchema = z.object({
  type: z.literal("response.created"),
  sequence_number: z.number(),
  response: ResponseObjectSchema,
});

export const OutputItemAddedEventSchema = z.object({
  type: z.literal("response.output_item.added"),
  sequence_number: z.number(),
  output_index: z.number(),
  item: MessageItemSchema,
});

export const ContentPartAddedEventSchema = z.object({
  type: z.literal("response.content_part.added"),
  sequence_number: z.number(),
  item_id: z.string(),
  output_index: z.number(),
  content_index: z.number(),
  part: OutputTextPartSchema,
});

export const OutputTextDeltaEventSchema = z.object({
  type: z.literal("response.output_text.delta"),
  sequence_number: z.number(),
  item_id: z.string(),
  output_index: z.number(),
  content_index: z.number(),
  delta: z.string(),
});

export const OutputTextDoneEventSchema = z.object({
  type: z.literal("response.output_text.done"),
  sequence_number: z.number(),
  item_id: z.string(),
  output_index: z.number(),
  content_index: z.number(),
  text: z.string(),
});

export const ContentPartDoneEventSchema = z.object({
  type: z.literal("response.content_part.done"),
  sequence_number: z.number(),
  item_id: z.string(),
  output_index: z.number(),
  content_index: z.number(),
  part: OutputTextPartSchema,
});

export const OutputItemDoneEventSchema = z.object({
  type: z.literal("response.output_item.done"),
  sequence_number: z.number(),
  output_index: z.number(),
  item: MessageItemSchema,
});

export const ResponseCompletedEventSchema = z.object({
  type: z.literal("response.completed"),
  sequence_number: z.number(),
  response: ResponseObjectSchema,
});

export const SseEventSchema = z.discriminatedUnion("type", [
  ResponseCreatedEventSchema,
  OutputItemAddedEventSchema,
  ContentPartAddedEventSchema,
  OutputTextDeltaEventSchema,
  OutputTextDoneEventSchema,
  ContentPartDoneEventSchema,
  OutputItemDoneEventSchema,
  ResponseCompletedEventSchema,
]);

// ── Inferred types ──

export type ResponseCreatedEvent = z.infer<typeof ResponseCreatedEventSchema>;
export type OutputItemAddedEvent = z.infer<typeof OutputItemAddedEventSchema>;
export type ContentPartAddedEvent = z.infer<typeof ContentPartAddedEventSchema>;
export type OutputTextDeltaEvent = z.infer<typeof OutputTextDeltaEventSchema>;
export type OutputTextDoneEvent = z.infer<typeof OutputTextDoneEventSchema>;
export type ContentPartDoneEvent = z.infer<typeof ContentPartDoneEventSchema>;
export type OutputItemDoneEvent = z.infer<typeof OutputItemDoneEventSchema>;
export type ResponseCompletedEvent = z.infer<typeof ResponseCompletedEventSchema>;
export type SseEvent = z.infer<typeof SseEventSchema>;
