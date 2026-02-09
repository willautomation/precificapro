import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256Base64Url(verifier: string) {
  const hash = crypto.createHash("sha256").update(verifier).digest();
  return base64url(hash);
}

function randomString(len = 32) {
  const bytes = crypto.randomBytes(len);
  return base64url(bytes);
}

export async function GET(req: NextRequest) {
  const ML_CLIENT_ID = process.env.ML_CLIENT_ID;
  const ML_REDIRECT_URI = process.env.ML_REDIRECT_URI;

  if (!ML_CLIENT_ID || !ML_REDIRECT_URI) {
    return new NextResponse("Missing ML_CLIENT_ID or ML_REDIRECT_URI", { status: 500 });
  }

  const code_verifier = randomString(64);
  const code_challenge = sha256Base64Url(code_verifier);
  const state = randomString(24);

  const authUrl = new URL("https://auth.mercadolivre.com.br/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", ML_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", ML_REDIRECT_URI);
  authUrl.searchParams.set("state", state);
  authUrl.searchParams.set("code_challenge", code_challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");

  const res = NextResponse.redirect(authUrl.toString(), 307);

  res.cookies.set("ml_oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  res.cookies.set("ml_code_verifier", code_verifier, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10,
  });

  return res;
}
