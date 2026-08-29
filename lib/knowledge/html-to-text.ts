/**
 * Strips a single HTML page down to its readable text. Deliberately
 * simple — this build's scope is "paste a single URL," not a real
 * readability/boilerplate-removal algorithm. Good enough for a blog
 * post or docs page; will include nav/footer text on a busier page,
 * which is an honest limitation to note in the UI, not silently pretend
 * away by shipping something that looks smarter than it is.
 */
export function htmlToText(html: string): string {
  let text = html;

  // Drop entire elements whose content is never real page content.
  text = text.replace(/<(script|style|noscript|svg|iframe)[^>]*>[\s\S]*?<\/\1>/gi, " ");

  // Block-level tags become paragraph breaks so chunking still respects
  // the page's structure instead of treating it as one wall of text.
  text = text.replace(/<\/(p|div|section|article|li|h[1-6]|br|tr)\s*>/gi, "\n\n");
  text = text.replace(/<br\s*\/?>/gi, "\n");

  // Strip remaining tags.
  text = text.replace(/<[^>]+>/g, " ");

  // Decode the handful of entities that show up constantly in real pages.
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&#39;": "'",
    "&apos;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
  };
  text = text.replace(
    /&nbsp;|&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&mdash;|&ndash;/g,
    (match) => entities[match] ?? match
  );

  // Collapse excess whitespace left behind by all the above, but keep
  // paragraph breaks meaningful for the chunker.
  text = text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 0)
    .join("\n\n");

  return text.trim();
}
