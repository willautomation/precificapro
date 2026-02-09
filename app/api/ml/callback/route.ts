import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");

  if (!code) {
    return NextResponse.json({ error: "No code" }, { status: 400 });
  }

  const tokenResponse = await fetch("https://api.mercadolibre.com/oauth/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: process.env.ML_CLIENT_ID!,
      client_secret: process.env.ML_CLIENT_SECRET!,
      code: code,
      redirect_uri: process.env.ML_REDIRECT_URI!,
    }),
  });

  const data = await tokenResponse.json();

  if (!data.access_token) {
    return NextResponse.json({ error: data }, { status: 500 });
  }

  const response = NextResponse.redirect(process.env.NEXT_PUBLIC_APP_URL!);

  response.cookies.set("ml_access_token", data.access_token, {
    httpOnly: true,
    path: "/",
  });

  return response;
}
