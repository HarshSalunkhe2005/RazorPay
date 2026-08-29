import { NextRequest, NextResponse } from "next/server";
import { runRecoveryAgent } from "@/lib/agent";
import { isRateLimited, clientIdentifier } from "@/lib/rate-limit";
import { FailedPaymentSchema } from "@/lib/schemas";

export async function POST(req: NextRequest) {
  if (isRateLimited(clientIdentifier(req))) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // There's no database - the client's in-memory dataset (seeded or user-uploaded) is
  // the record of truth, so the full payment object travels with the request rather than
  // an id the server would look up. It's client-supplied input crossing a trust boundary,
  // so it gets validated here, not just trusted.
  const parsed = FailedPaymentSchema.safeParse((body as { payment?: unknown })?.payment);
  if (!parsed.success) {
    return NextResponse.json(
      { error: `Invalid payment data: ${parsed.error.issues[0]?.message ?? "malformed request"}` },
      { status: 400 }
    );
  }

  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json(
      { error: "GEMINI_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const result = await runRecoveryAgent(parsed.data);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Recovery agent error:", err);
    return NextResponse.json(
      { error: "Recovery agent failed to run. Please try again." },
      { status: 502 }
    );
  }
}
