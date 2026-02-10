import { NextResponse } from "next/server";

function base64UrlEncode(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(length = 64) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += chars[bytes[i] % chars.length];
  return out;
}

async function sha256(input: string) {
  const data = new TextEncoder().encode(input);
  return crypto.subtle.digest("SHA-256", data);
}

export async function GET() {
  const ML_CLIENT_ID = process.env.ML_CLIENT_ID || process.env.ID_do_CLIENTE_ML;
  const REDIRECT_URI = process.env.ML_REDIRECT_URI;
  const NEXT_PUBLIC_APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://precificapro-pi.vercel.app";

  if (!ML_CLIENT_ID || !REDIRECT_URI) {
    return NextResponse.json(
      { error: "missing_env", message: "Faltam ML_CLIENT_ID (ou ID_do_CLIENTE_ML) e/ou ML_REDIRECT_URI no ambiente." },
      { status: 500 }
    );
  }

  // PKCE
  const codeVerifier = randomString(96);
  const challengeBuffer = await sha256(codeVerifier);
  const codeChallenge = base64UrlEncode(challengeBuffer);

  // State
  const state = randomString(32);

  const authUrl = new URL("https://auth.mercadolivre.com.br/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", ML_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", codeChallenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString());

  // Cookies precisam existir no callback
  res.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  res.cookies.set("ml_code_verifier", codeVerifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  // (opcional) pra depurar: origem do app
  res.cookies.set("ml_app_url", NEXT_PUBLIC_APP_URL, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
