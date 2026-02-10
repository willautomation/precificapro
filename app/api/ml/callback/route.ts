import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");

    if (!code || !state) {
      return NextResponse.json(
        { error: "missing_params", message: "Parâmetros obrigatórios ausentes: code e/ou state." },
        { status: 400 }
      );
    }

    const ML_CLIENT_ID = process.env.ML_CLIENT_ID || process.env.ID_do_CLIENTE_ML;
    const ML_CLIENT_SECRET = process.env.ML_CLIENT_SECRET;
    const REDIRECT_URI = process.env.ML_REDIRECT_URI;
    const ML_BASE_URL = process.env.ML_BASE_URL || "https://api.mercadolibre.com";

    if (!ML_CLIENT_ID || !ML_CLIENT_SECRET || !REDIRECT_URI) {
      return NextResponse.json(
        { error: "missing_env", message: "Faltam ML_CLIENT_ID/ID_do_CLIENTE_ML, ML_CLIENT_SECRET ou ML_REDIRECT_URI no ambiente." },
        { status: 500 }
      );
    }

    // Ler cookies do request
    const cookieHeader = req.headers.get("cookie") || "";
    const cookies = Object.fromEntries(
      cookieHeader.split(";").map(v => v.trim()).filter(Boolean).map(v => {
        const idx = v.indexOf("=");
        if (idx === -1) return [v, ""];
        return [decodeURIComponent(v.slice(0, idx)), decodeURIComponent(v.slice(idx + 1))];
      })
    );

    const savedState = cookies["ml_oauth_state"];
    const codeVerifier = cookies["ml_code_verifier"];
    const appUrl = cookies["ml_app_url"] || process.env.NEXT_PUBLIC_APP_URL || "https://precificapro-pi.vercel.app";

    if (!savedState) {
      // Se não tem state salvo, o navegador perdeu cookie (ou user abriu em outra aba depois de muito tempo).
      // Melhor orientar a refazer o login.
      return NextResponse.json(
        { error: "missing_state_cookie", message: "Cookie ml_oauth_state não encontrado. Inicie o login novamente." },
        { status: 400 }
      );
    }

    if (savedState !== state) {
      return NextResponse.json(
        { error: "invalid_state", message: "Estado inválido (state não confere). Inicie o login novamente." },
        { status: 400 }
      );
    }

    if (!codeVerifier) {
      return NextResponse.json(
        { error: "missing_code_verifier", message: "code_verifier é obrigatório (PKCE). Cookie ml_code_verifier não encontrado." },
        { status: 400 }
      );
    }

    // Trocar code por tokens
    const tokenUrl = `${ML_BASE_URL}/oauth/token`;

    const body = new URLSearchParams();
    body.set("grant_type", "authorization_code");
    body.set("client_id", ML_CLIENT_ID);
    body.set("client_secret", ML_CLIENT_SECRET);
    body.set("code", code);
    body.set("redirect_uri", REDIRECT_URI);
    body.set("code_verifier", codeVerifier);

    const tokenRes = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const tokenJson = await tokenRes.json();

    if (!tokenRes.ok) {
      return NextResponse.json(
        { error: "token_exchange_failed", status: tokenRes.status, details: tokenJson },
        { status: 500 }
      );
    }

    // Salvar tokens em cookies (simples). Se você já tem outro storage, ajuste depois.
    const response = NextResponse.redirect(appUrl);

    response.cookies.set("ml_access_token", tokenJson.access_token || "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: Number(tokenJson.expires_in || 3600),
    });

    response.cookies.set("ml_refresh_token", tokenJson.refresh_token || "", {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 60, // 60 dias
    });

    // Limpar cookies temporários do OAuth
    response.cookies.set("ml_oauth_state", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    response.cookies.set("ml_code_verifier", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });
    response.cookies.set("ml_app_url", "", { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 0 });

    return response;
  } catch (err: any) {
    return NextResponse.json(
      { error: "callback_exception", message: err?.message || "Erro inesperado no callback." },
      { status: 500 }
    );
  }
}
