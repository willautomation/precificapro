import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const returnedState = url.searchParams.get("state");

    const clientId = process.env.ML_CLIENT_ID || process.env.ID_do_CLIENTE_ML;
    const clientSecret = process.env.ML_CLIENT_SECRET;
    const redirectUri = process.env.ML_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      return NextResponse.json(
        {
          error: "missing_env",
          message:
            "Faltam variáveis ML_CLIENT_ID (ou ID_do_CLIENTE_ML), ML_CLIENT_SECRET e/ou ML_REDIRECT_URI no ambiente.",
        },
        { status: 500 }
      );
    }

    if (!code) {
      return NextResponse.json(
        { error: "missing_code", message: "Não veio ?code= no callback." },
        { status: 400 }
      );
    }

    const cookieState = req.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("ml_oauth_state="))
      ?.split("=")?.[1];

    const codeVerifier = req.headers
      .get("cookie")
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("ml_code_verifier="))
      ?.split("=")?.[1];

    if (!returnedState || !cookieState || returnedState !== cookieState) {
      return NextResponse.json(
        {
          error: "invalid_state",
          message: "Estado inválido (state não bate com cookie).",
          returnedState,
          cookieState,
        },
        { status: 400 }
      );
    }

    if (!codeVerifier) {
      return NextResponse.json(
        {
          error: "missing_code_verifier",
          message:
            "code_verifier é obrigatório (PKCE). Cookie ml_code_verifier não encontrado.",
        },
        { status: 400 }
      );
    }

    // Troca code -> token (com PKCE code_verifier)
    const tokenRes = await fetch("https://api.mercadolibre.com/oauth/token", {
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

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json(
        {
          error: "token_exchange_failed",
          status: tokenRes.status,
          tokenJson,
        },
        { status: 500 }
      );
    }

    const accessToken = tokenJson?.access_token;
    const refreshToken = tokenJson?.refresh_token;

    // Se quiser, dá pra puxar /users/me aqui depois.
    // Por enquanto, só salvamos tokens.

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL || "https://precificapro-pi.vercel.app";

    const res = NextResponse.redirect(`${appUrl}/?ml=ok`);

    // Salva tokens em cookies httpOnly
    // OBS: maxAge do access token pode ser o expires_in (segundos). Mantive 6h pra segurança.
    res.cookies.set("ml_access_token", accessToken, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 6 * 60 * 60,
    });

    if (refreshToken) {
      res.cookies.set("ml_refresh_token", refreshToken, {
        httpOnly: true,
        secure: true,
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60, // 30 dias
      });
    }

    // Limpa cookies temporários do OAuth
    res.cookies.set("ml_oauth_state", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    res.cookies.set("ml_code_verifier", "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return res;
  } catch (err: any) {
    return NextResponse.json(
      { error: "callback_crash", message: String(err?.message || err) },
      { status: 500 }
    );
  }
}
