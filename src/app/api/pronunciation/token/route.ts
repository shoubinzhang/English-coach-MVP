import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Mint an Azure Speech short-lived token (10 min) for the browser SDK.
// Browser uses it instead of the long-lived key.
export async function GET() {
  const key = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!key || !region) {
    return NextResponse.json(
      { error: "AZURE_SPEECH_KEY and AZURE_SPEECH_REGION not configured" },
      { status: 503 },
    );
  }

  const r = await fetch(
    `https://${region}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`,
    {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": key,
        "Content-Length": "0",
      },
    },
  );
  if (!r.ok) {
    return NextResponse.json({ error: `Azure token mint failed: ${r.status}` }, { status: 502 });
  }
  const token = await r.text();
  return NextResponse.json({ token, region });
}
