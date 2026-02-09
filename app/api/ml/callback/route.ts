import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
    }

    const clientId = process.env.ML_CLIENT_ID;
    const clientSecret = process.env.ML_CLIENT_SECRET;
    const redirectUri = process.env.ML_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        { error: "Missing ML_CLIENT_ID / ML_CLIENT_SECRET / ML_REDIRECT_URI" },
        { status: 500 }
      );
    }

    // Lê cookies (PKCE + state)
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((c) => c.trim())
        .filter(Boolean)
        .map((c) => {
          const idx = c.indexOf("=");
          if (idx === -1) return [c, ""];
          return [decodeURIComponent(c.slice(0, idx)), decodeURIComponent(c.slice(idx + 1))];
        })
    );

    const savedState = cookies["ml_oauth_state"];
    const codeVerifier = cookies["ml_pkce_verifier"];

    if (!savedState || !codeVerifier) {
      return NextResponse.json(
        { error: "Missing PKCE cookies (ml_oauth_state / ml_pkce_verifier). Start login again." },
        { status: 400 }
      );
    }

    if (state && savedState !== state) {
      return NextResponse.json({ error: "Invalid state" }, { status: 400 });
    }

    // Trocar code por token (PKCE exige code_verifier)
    const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("TOKEN ERROR:", tokenData);
      return NextResponse.json(tokenData, { status: 500 });
    }

    // Se chegou aqui: token OK.
    const res = NextResponse.redirect(new URL("/", req.url));

    // limpa cookies de PKCE/state
    res.cookies.set("ml_pkce_verifier", "", { path: "/", maxAge: 0 });
    res.cookies.set("ml_oauth_state", "", { path: "/", maxAge: 0 });

    // (opcional) você pode salvar access_token em cookie se quiser usar depois no /api/ml/me
    // res.cookies.set("ml_access_token", tokenData.access_token, { httpOnly:true, secure:true, sameSite:"lax", path:"/", maxAge: 60*60 });

    return res;
  } catch (err) {
    console.error("CALLBACK CRASH:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
