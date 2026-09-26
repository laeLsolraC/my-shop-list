export interface Env {
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  ALLOWED_ORIGIN: string;
}

const TOKEN_URL = "https://oauth2.googleapis.com/token";

function corsHeaders(env: Env): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": env.ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  };
}

async function forwardToGoogle(env: Env, params: Record<string, string>): Promise<Response> {
  const body = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID,
    client_secret: env.GOOGLE_CLIENT_SECRET,
    ...params,
  });
  const googleResp = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  const data = await googleResp.text();
  return new Response(data, {
    status: googleResp.status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const headers = corsHeaders(env);

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers });
    }

    const url = new URL(request.url);
    let body: Record<string, string>;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: "invalid_json" }), {
        status: 400,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }

    let resp: Response;
    if (url.pathname === "/token/exchange") {
      const { code, code_verifier, redirect_uri } = body;
      resp = await forwardToGoogle(env, {
        code,
        code_verifier,
        redirect_uri,
        grant_type: "authorization_code",
      });
    } else if (url.pathname === "/token/refresh") {
      const { refresh_token } = body;
      resp = await forwardToGoogle(env, {
        refresh_token,
        grant_type: "refresh_token",
      });
    } else {
      return new Response("Not found", { status: 404, headers });
    }

    const merged = new Headers(resp.headers);
    for (const [k, v] of Object.entries(headers)) merged.set(k, v);
    return new Response(resp.body, { status: resp.status, headers: merged });
  },
};
