import { NextRequest, NextResponse } from "next/server";
import { getPaymentById } from "@/lib/mock-data";
import { runRecoveryAgent } from "@/lib/agent";

export async function POST(req: NextRequest) {
  let paymentId: string | undefined;
  try {
    const body = await req.json();
    paymentId = body?.paymentId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!paymentId) {
    return NextResponse.json({ error: "paymentId is required" }, { status: 400 });
  }

  const payment = getPaymentById(paymentId);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY is not configured on the server" },
      { status: 500 }
    );
  }

  try {
    const result = await runRecoveryAgent(payment);
    return NextResponse.json(result);
  } catch (err) {
    console.error("Recovery agent error:", err);
    return NextResponse.json(
      { error: "Recovery agent failed to run. Please try again." },
      { status: 502 }
    );
  }
}
