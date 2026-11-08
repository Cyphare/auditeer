import { NextRequest, NextResponse } from "next/server";
import { SERVER_DOCUMENTS } from "@/lib/server/knowledge";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const docId = (body.doc_id || "CUSTOM-01").toUpperCase();
  const title = body.title || "Custom Ingested SOP";
  const category = body.category || "General SOP";
  const clearance = body.clearance || "PUBLIC_INTERNAL";
  const owner = body.owner || "Engineering Contributor";
  const content = body.content || "";

  SERVER_DOCUMENTS.push({
    doc_id: docId,
    title,
    category,
    clearance,
    owner,
    last_updated: new Date().toISOString().substring(0, 10),
    sections: [{ heading: "1. Overview & Standard", content }],
  });

  return NextResponse.json({
    status: "indexed",
    doc_id: docId,
    title,
    clearance,
    chunk_count: 1,
    total_chunks_in_vault: SERVER_DOCUMENTS.reduce((a, b) => a + b.sections.length, 0),
  });
}
