/**
 * API base URL for the ZER0 HTTP service.
 *
 * Under S7 the SPA and the API are two separate origins:
 *   - web  http://localhost:3000  (nginx serving dist/web/)
 *   - api  http://localhost:3001  (services/api/server.js)
 *
 * The base is injected at build time via VITE_API_BASE_URL. In `vite dev`
 * the value defaults to the docker-compose API port so cross-origin
 * fetches hit the real API instead of the Vite dev server.
 */

const raw = import.meta.env && import.meta.env.VITE_API_BASE_URL;
const trimmed = typeof raw === "string" ? raw.replace(/\/+$/, "") : "";

export const API_BASE = trimmed || "http://localhost:3001";

/** Build an absolute URL for an API path such as `/runs` or `/cloud/local?...`. */
export function apiUrl(path) {
  const suffix = String(path || "");
  if (!suffix) return API_BASE;
  return suffix.startsWith("/") ? `${API_BASE}${suffix}` : `${API_BASE}/${suffix}`;
}
