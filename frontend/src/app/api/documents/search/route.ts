import { NextRequest, NextResponse } from "next/server";
import { SERVER_DOCUMENTS } from "@/lib/server/knowledge";
import { ROLE_PROFILES } from "@/lib/server/security";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const query = (body.query || "").toLowerCase();
  const role = body.role || "data_engineer";
  const profile = ROLE_PROFILES[role] || ROLE_PROFILES.junior_analyst;

  const authHits: any[] = [];
  const blockedHits: any[] = [];

  for (const doc of SERVER_DOCUMENTS) {
    for (let i = 0; i < doc.sections.length; i++) {
      const sec = doc.sections[i];
      const match =
        doc.title.toLowerCase().includes(query) ||
        sec.heading.toLowerCase().includes(query) ||
        sec.content.toLowerCase().includes(query) ||
        query.split(" ").some((w: string) => w.length > 3 && sec.content.toLowerCase().includes(w));

      if (match) {
        const allowed = profile.allowed_clearances.includes(doc.clearance);
        const chunk = {
          chunk_id: `${doc.doc_id}#C${i + 1}`,
          doc_id: doc.doc_id,
          title: doc.title,
          section: sec.heading,
          category: doc.category,
          clearance: doc.clearance,
          bm25_score: 3.2,
          vector_score: 0.25,
          rrf_score: 0.045,
          snippet: sec.content,
          access_granted: allowed,
        };

        if (allowed) {
          authHits.push(chunk);
        } else {
          blockedHits.push({
            ...chunk,
            snippet: `[REDACTED BY RBAC] Role '${profile.label}' lacks '${doc.clearance}' clearance.`,
          });
        }
      }
    }
  }

  return NextResponse.json({
    query,
    role,
    authorized_chunks: authHits.slice(0, 5),
    blocked_chunks: blockedHits.slice(0, 3),
  });
}
