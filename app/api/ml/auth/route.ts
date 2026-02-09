import { NextResponse } from "next/server";
import crypto from "crypto";

function base64url(input: Buffer) {
  return input
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function sha256(buffer: Buffer) {
  return crypto.createHash("sha256").update(buffer).digest();
}

export async function GET(req: Request) {
  try {
    const clientId = process.env.ML_CLIENT_ID;
    const redirectUri = process.env.ML_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      return NextResponse.json(
        { error: "Missing ML_CLIENT_ID or ML_REDIRECT_URI" },
        { status: 500 }
      );
    }

    // PKCE: code_verifier + code_challenge
    const codeVerifier = base64url(crypto.randomBytes(32)); // 43-128 chars (ok)
    const codeChallenge = base64url(sha256(Buffer.from(codeVerifier)));

    // state (anti-CSRF)
    const state = base64url(crypto.randomBytes(16));

    const authUrl = new URL("https://auth.mercadolivre.com.br/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("state", state);

    // PKCE params
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");

    const res = NextResponse.redirect(authUrl.toString());

    // Guardar verifier e state em cookies HttpOnly (pra usar no callback)
    res.cookies.set("ml_pkce_verifier", codeVerifier, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60, // 10 min
    });

    res.cookies.set("ml_oauth_state", state, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 10 * 60,
    });

    return res;
  } catch (err) {
    console.error("ML AUTH CRASH:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
