export interface ChunkOptions {
  /** Target chunk size in characters, not tokens — good enough approximation
   * for chunking (roughly 4 chars/token for English), and avoids pulling in
   * a tokenizer just for this. */
  maxChars: number;
  /** Characters of overlap between consecutive chunks, so a fact sitting
   * right at a chunk boundary isn't invisible to retrieval either side. */
  overlapChars: number;
}

export const DEFAULT_CHUNK_OPTIONS: ChunkOptions = {
  maxChars: 1200,
  overlapChars: 150,
};

/**
 * Splits text into overlapping chunks, preferring to break on paragraph
 * boundaries and falling back to sentence boundaries, then hard character
 * limits only as a last resort — a chunk that ends mid-sentence is worse
 * for retrieval quality than a slightly-over-length chunk that ends cleanly.
 *
 * Pure and synchronous, so it's fully covered by unit tests without any
 * embedding call.
 */
export function chunkText(
  rawText: string,
  options: ChunkOptions = DEFAULT_CHUNK_OPTIONS
): string[] {
  const text = rawText.trim().replace(/\r\n/g, "\n");
  if (text.length === 0) return [];

  const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
  const chunks: string[] = [];
  let current = "";

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    // A single paragraph longer than the whole chunk budget gets split on
    // its own, sentence by sentence — otherwise one long paragraph would
    // produce one oversized chunk with no internal boundary to break on.
    if (trimmedParagraph.length > options.maxChars) {
      if (current) {
        chunks.push(current);
        current = "";
      }
      chunks.push(...splitLongParagraph(trimmedParagraph, options));
      continue;
    }

    const candidate = current ? `${current}\n\n${trimmedParagraph}` : trimmedParagraph;

    if (candidate.length <= options.maxChars) {
      current = candidate;
    } else {
      chunks.push(current);
      // Start the next chunk with the tail of the previous one, so
      // context isn't lost right at the boundary.
      const overlap = tailOverlap(current, options.overlapChars);
      current = overlap ? `${overlap}\n\n${trimmedParagraph}` : trimmedParagraph;
    }
  }

  if (current) chunks.push(current);

  return chunks;
}

function splitLongParagraph(paragraph: string, options: ChunkOptions): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s|$)/g) ?? [paragraph];
  const chunks: string[] = [];
  let current = "";

  for (const sentence of sentences) {
    const candidate = current ? current + sentence : sentence;
    if (candidate.length <= options.maxChars) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      // A single sentence longer than maxChars (rare, but real for
      // things like long URLs pasted as "text") gets hard-split rather
      // than producing one giant unsplittable chunk.
      if (sentence.length > options.maxChars) {
        for (let i = 0; i < sentence.length; i += options.maxChars) {
          chunks.push(sentence.slice(i, i + options.maxChars).trim());
        }
        current = "";
      } else {
        current = sentence;
      }
    }
  }
  if (current) chunks.push(current.trim());

  return chunks;
}

function tailOverlap(text: string, overlapChars: number): string {
  if (text.length <= overlapChars) return text;
  return text.slice(text.length - overlapChars);
}
