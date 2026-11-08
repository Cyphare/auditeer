import { NextResponse } from "next/server";
import { SERVER_DOCUMENTS } from "@/lib/server/knowledge";
import { ROLE_PROFILES } from "@/lib/server/security";

export async function GET() {
  return NextResponse.json({
    status: "healthy",
    service: "Auditeer",
    indexed_documents: SERVER_DOCUMENTS.length,
    indexed_chunks: SERVER_DOCUMENTS.reduce((acc, d) => acc + d.sections.length, 0),
    default_provider: "zero_key",
    roles: Object.values(ROLE_PROFILES),
  });
}
