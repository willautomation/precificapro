import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const ml_oauth_state = req.cookies.get("ml_oauth_state")?.value;
  const ml_code_verifier = req.cookies.get("ml_code_verifier")?.value;

  if (!code || !state || !ml_oauth_state || !ml_code_verifier || state !== ml_oauth_state) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const client_id = process.env.ML_CLIENT_ID;
  const client_secret = process.env.ML_CLIENT_SECRET;
  const redirect_uri = process.env.ML_REDIRECT_URI;

  if (!client_id || !client_secret || !redirect_uri) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    client_id,
    client_secret,
    code,
    redirect_uri,
    code_verifier: ml_code_verifier,
  });

  const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const data = (await tokenRes.json()) as {
    access_token?: string;
    refresh_token?: string;
    user_id?: number;
  };

  if (!data.access_token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  const res = NextResponse.redirect(new URL("/", req.url));

  res.cookies.set("ml_access_token", data.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 6,
  });

  if (data.refresh_token) {
    res.cookies.set("ml_refresh_token", data.refresh_token, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  if (data.user_id != null) {
    res.cookies.set("ml_user_id", String(data.user_id), {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
    });
  }

  return res;
}
