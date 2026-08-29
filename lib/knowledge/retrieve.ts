import "server-only";
import { hybridRetrieveForQuery } from "./hybrid-retrieve";
import type { RetrievedChunk } from "./retrieval-logic";

export interface RetrievalResult {
  chunks: RetrievedChunk[];
  contextBlock: string;
  useFallback: boolean;
}

export async function retrieveForQuery(botId: string, query: string): Promise<RetrievalResult> {
  const result = await hybridRetrieveForQuery(botId, query);
  const contextBlock = result.chunks.map((chunk, i) => `[Source ${i + 1}: ${chunk.sourceTitle}]\n${chunk.content}`).join("\n\n---\n\n");
  return { chunks: result.chunks, contextBlock, useFallback: result.useFallback };
}
