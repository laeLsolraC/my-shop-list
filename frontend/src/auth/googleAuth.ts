import { generateCodeChallenge, generateCodeVerifier } from "./pkce";
import { GOOGLE_CLIENT_ID, REDIRECT_URI, SCOPES, WORKER_URL } from "../config";
import { clearTokens, getTokens, setTokens, type StoredTokens } from "../offline/db";

const VERIFIER_STORAGE_KEY = "pkce_code_verifier";

export class AuthError extends Error {}

export async function startLogin(): Promise<void> {
  const verifier = generateCodeVerifier();
  sessionStorage.setItem(VERIFIER_STORAGE_KEY, verifier);
  const challenge = await generateCodeChallenge(verifier);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", GOOGLE_CLIENT_ID);
  url.searchParams.set("redirect_uri", REDIRECT_URI);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");

  window.location.assign(url.toString());
}

export async function handleCallback(code: string): Promise<void> {
  const verifier = sessionStorage.getItem(VERIFIER_STORAGE_KEY);
  if (!verifier) throw new AuthError("Missing PKCE verifier — login must be restarted");
  sessionStorage.removeItem(VERIFIER_STORAGE_KEY);

  const resp = await fetch(`${WORKER_URL}/token/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, code_verifier: verifier, redirect_uri: REDIRECT_URI }),
  });
  if (!resp.ok) throw new AuthError(`Token exchange failed: ${resp.status}`);
  const data = await resp.json();
  await persistTokenResponse(data);
}

async function persistTokenResponse(data: {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
}): Promise<void> {
  const existing = await getTokens();
  const refresh_token = data.refresh_token ?? existing?.refresh_token;
  if (!refresh_token) throw new AuthError("No refresh token available");
  const tokens: StoredTokens = {
    access_token: data.access_token,
    refresh_token,
    expires_at: Date.now() + data.expires_in * 1000 - 60_000, // refresh 1 min early
  };
  await setTokens(tokens);
}

async function refresh(refresh_token: string): Promise<void> {
  const resp = await fetch(`${WORKER_URL}/token/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token }),
  });
  if (!resp.ok) throw new AuthError(`Token refresh failed: ${resp.status}`);
  const data = await resp.json();
  await persistTokenResponse(data);
}

export async function isAuthenticated(): Promise<boolean> {
  return (await getTokens()) !== undefined;
}

export async function logout(): Promise<void> {
  await clearTokens();
}

/** Returns a valid access token, transparently refreshing if stale. Throws AuthError if not logged in or refresh fails. */
export async function getValidAccessToken(): Promise<string> {
  const tokens = await getTokens();
  if (!tokens) throw new AuthError("Not authenticated");
  if (Date.now() < tokens.expires_at) return tokens.access_token;
  await refresh(tokens.refresh_token);
  const refreshed = await getTokens();
  if (!refreshed) throw new AuthError("Not authenticated");
  return refreshed.access_token;
}
