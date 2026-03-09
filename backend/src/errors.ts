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
