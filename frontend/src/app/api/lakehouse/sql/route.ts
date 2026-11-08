import { NextRequest, NextResponse } from "next/server";
import { executeSafeSQL } from "@/lib/server/lakehouse";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = executeSafeSQL(body.sql || "", body.role || "executive");
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ detail: err.message }, { status: 400 });
  }
}
