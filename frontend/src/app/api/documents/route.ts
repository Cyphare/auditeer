import { NextRequest, NextResponse } from "next/server";
import { SERVER_DOCUMENTS } from "@/lib/server/knowledge";
import { ROLE_PROFILES } from "@/lib/server/security";

export async function GET(req: NextRequest) {
  const role = req.nextUrl.searchParams.get("role") || "data_engineer";
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.junior_analyst;

  const docs = SERVER_DOCUMENTS.map((d) => {
    const accessible = profile.allowed_clearances.includes(d.clearance);
    return {
      doc_id: d.doc_id,
      title: d.title,
      category: d.category,
      clearance: d.clearance,
      owner: d.owner,
      last_updated: d.last_updated,
      chunk_count: d.sections.length,
      accessible,
      preview: accessible
        ? d.sections[0].content
        : `[LOCKED — Requires ${d.clearance} clearance]`,
    };
  });

  return NextResponse.json({
    role,
    total_documents: docs.length,
    total_chunks: SERVER_DOCUMENTS.reduce((acc, d) => acc + d.sections.length, 0),
    documents: docs,
  });
}
