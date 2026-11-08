import type {
  ChatResponse,
  ClearanceLevel,
  EvalSuiteSummary,
  LLMConfig,
  RoleMetadata,
  RoleType,
  SQLQueryResult,
  VaultDocument,
  CitationChunk,
} from "./types";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") || "http://127.0.0.1:8000";

export async function fetchHealth(): Promise<{
  status: string;
  service: string;
  indexed_documents: number;
  indexed_chunks: number;
  default_provider: string;
  roles: RoleMetadata[];
}> {
  const res = await fetch(`${API_BASE}/api/health`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Backend unreachable (${res.status})`);
  return res.json();
}

export async function sendChatMessage(payload: {
  message: string;
  role: RoleType;
  llm_config: LLMConfig;
  auto_action?: boolean;
}): Promise<ChatResponse> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || `Chat API error (${res.status})`);
  }
  return res.json();
}

export async function fetchDocuments(role: RoleType): Promise<{
  role: RoleType;
  total_documents: number;
  total_chunks: number;
  documents: VaultDocument[];
}> {
  const res = await fetch(`${API_BASE}/api/documents?role=${role}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to load Knowledge Vault");
  return res.json();
}

export async function ingestDocument(payload: {
  doc_id: string;
  title: string;
  category: string;
  clearance: ClearanceLevel;
  owner: string;
  content: string;
}): Promise<{
  status: string;
  doc_id: string;
  title: string;
  clearance: ClearanceLevel;
  chunk_count: number;
  total_chunks_in_vault: number;
}> {
  const res = await fetch(`${API_BASE}/api/documents/ingest`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(errText || "Failed to ingest document");
  }
  return res.json();
}

export async function searchVaultChunks(payload: {
  query: string;
  role: RoleType;
  top_k?: number;
}): Promise<{
  query: string;
  role: RoleType;
  authorized_chunks: CitationChunk[];
  blocked_chunks: CitationChunk[];
}> {
  const res = await fetch(`${API_BASE}/api/documents/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Retrieval search failed");
  return res.json();
}

export async function fetchLakehouseSnapshot(role: RoleType): Promise<{
  role: RoleType;
  tables: Record<
    string,
    { accessible: boolean; rows: Record<string, string | number>[] }
  >;
}> {
  const res = await fetch(`${API_BASE}/api/lakehouse/snapshot?role=${role}`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch Lakehouse telemetry");
  return res.json();
}

export async function executeCustomSQL(payload: {
  sql: string;
  role: RoleType;
}): Promise<SQLQueryResult> {
  const res = await fetch(`${API_BASE}/api/lakehouse/sql`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "SQL query rejected" }));
    throw new Error(err.detail || "SQL query rejected");
  }
  return res.json();
}

export async function runGoldenBenchmark(
  llm_config: LLMConfig
): Promise<EvalSuiteSummary> {
  const res = await fetch(`${API_BASE}/api/eval/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ llm_config }),
  });
  if (!res.ok) throw new Error("Evaluation benchmark failed");
  return res.json();
}
