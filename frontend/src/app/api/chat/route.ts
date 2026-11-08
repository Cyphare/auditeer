import { NextRequest, NextResponse } from "next/server";
import { processChatRequest } from "@/lib/server/engine";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = processChatRequest(body);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
