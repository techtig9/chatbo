import "server-only";
import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";

// 768, not Gemini's 3072 default — must match the DB migration below.
export const EMBEDDING_DIMENSIONS = 768;

let cachedClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing GEMINI_API_KEY. Set it in .env.local.");
  }
  if (!cachedClient) {
    cachedClient = new GoogleGenAI({ apiKey });
  }
  return cachedClient;
}

export async function embedTexts(
  texts: string[],
  inputType: "document" | "query"
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getClient();
  const taskType = inputType === "document" ? "RETRIEVAL_DOCUMENT" : "RETRIEVAL_QUERY";

  const response = await client.models.embedContent({
    model: EMBEDDING_MODEL,
    contents: texts,
    config: {
      taskType,
      outputDimensionality: EMBEDDING_DIMENSIONS,
    },
  });

  if (!response.embeddings || response.embeddings.length !== texts.length) {
    throw new Error(
      `Gemini embedding request returned ${response.embeddings?.length ?? 0} ` +
        `embeddings for ${texts.length} inputs.`
    );
  }

  return response.embeddings.map((e) => {
    if (!e.values) throw new Error("Gemini returned an embedding with no values.");
    return e.values;
  });
}

export async function embedText(text: string, inputType: "document" | "query"): Promise<number[]> {
  const [embedding] = await embedTexts([text], inputType);
  if (!embedding) {
    throw new Error("Gemini returned no embedding for the given text.");
  }
  return embedding;
}
