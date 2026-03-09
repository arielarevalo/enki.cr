export async function checkBackendHealth(): Promise<void> {
  const backendUrl = process.env.E2E_BACKEND_URL ?? "http://localhost:8787";
  try {
    const response = await fetch(`${backendUrl}/health`);
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
  } catch (error) {
    throw new Error(
      `Backend not reachable at ${backendUrl}. Start the backend first: cd backend && npm run dev\n${error}`,
    );
  }
}
