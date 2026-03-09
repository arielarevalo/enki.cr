const ALLOWED_ORIGIN = "https://enki.cr";
const ALLOWED_METHODS = "GET, POST, PUT, DELETE, OPTIONS";
const ALLOWED_HEADERS = "Authorization, Content-Type";

function corsHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": ALLOWED_METHODS,
    "Access-Control-Allow-Headers": ALLOWED_HEADERS,
  };
}

export function handlePreflight(): Response {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function addCorsHeaders(response: Response): Response {
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
  for (const [key, value] of Object.entries(corsHeaders())) {
    newResponse.headers.set(key, value);
  }
  return newResponse;
}
