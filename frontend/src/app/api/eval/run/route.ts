import { NextResponse } from "next/server";
import { runBenchmark } from "@/lib/server/evaluator";

export async function POST() {
  const result = runBenchmark();
  return NextResponse.json(result);
}
