import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const code = searchParams.get("code");

    if (!code) {
      return NextResponse.json({ error: "No code provided" }, { status: 400 });
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
        code,
        redirect_uri: process.env.ML_REDIRECT_URI!,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("TOKEN ERROR:", tokenData);
      return NextResponse.json(tokenData, { status: 500 });
    }

    // 🔥 TESTE CRÍTICO
    console.log("TOKEN OK:", tokenData);

    return NextResponse.redirect(new URL("/", req.url));

  } catch (err) {
    console.error("CALLBACK CRASH:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
