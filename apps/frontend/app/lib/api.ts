// Configurazione API base URL
// Usa il proxy di Next.js per evitare problemi CORS
export const API_BASE = process.env.NODE_ENV === 'production'
  ? '/api/orchestrator'
  : '/api/orchestrator';

// Helper per fetch con error handling
export async function apiFetch(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  return response;
}
