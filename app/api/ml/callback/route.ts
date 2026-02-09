import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!);
  }

  const response = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.ML_REDIRECT_URI!,
    }),
  });

  const data = await response.json();

  if (!data.access_token) {
    console.error("Erro ao obter token ML:", data);
    return NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!);
  }

  const res = NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!);

  res.cookies.set("ml_access_token", data.access_token, {
    httpOnly: true,
    path: "/",
  });

  return res;
}
