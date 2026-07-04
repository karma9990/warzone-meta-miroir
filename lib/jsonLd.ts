// Serializes an object for safe embedding inside a <script type="application/ld+json">.
// JSON.stringify alone does not escape characters that can break out of that tag.
const JSON_LD_ESCAPES: Record<string, string> = {
  '<': '\\u003c',
  '>': '\\u003e',
  '&': '\\u0026',
  '\u2028': '\\u2028',
  '\u2029': '\\u2029',
};

export function jsonLdHtml(data: unknown): string {
  return JSON.stringify(data).replace(/[<>&\u2028\u2029]/g, (char) => JSON_LD_ESCAPES[char]);
}
