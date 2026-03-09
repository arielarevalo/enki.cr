export function errorResponse(
  status: number,
  type: string,
  message: string,
): Response {
  return new Response(JSON.stringify({ error: { type, message } }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "NotFoundError";
  }
}

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}
