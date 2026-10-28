export function normalizeText(raw: string): string {
  return raw
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function carryOverlap(text: string, size: number): string {
  if (size <= 0) return "";
  const sentences = text.split(/(?<=[。！？!?；;])\s*/).filter(Boolean);
  let carry = "";
  for (let i = sentences.length - 1; i >= 0; i -= 1) {
    if ((sentences[i] + carry).length > size) break;
    carry = sentences[i] + carry;
  }
  return carry;
}

export function chunkText(raw: string, max = 260, overlap = 60): string[] {
  const text = normalizeText(raw);
  if (!text) return [];

  const paragraphs = text
    .split(/\n{2,}/)
    .map((item) => item.trim())
    .filter(Boolean);
  const chunks: string[] = [];
  let buffer = "";

  const push = (value: string) => {
    if (value.trim()) chunks.push(value.trim());
  };

  for (const paragraph of paragraphs) {
    const units = paragraph.split(/(?<=[。！？!?；;])\s*/).filter(Boolean);
    for (const unit of units) {
      if (buffer && (buffer + unit).length > max) {
        push(buffer);
        const carry = carryOverlap(buffer, overlap);
        buffer = (carry + unit).length > max ? unit : carry + unit;
      } else {
        buffer += unit;
      }
    }
    if (buffer && !buffer.endsWith("\n")) buffer += "\n";
  }

  push(buffer);
  return chunks;
}

export function truncate(text: string, size: number): string {
  const clean = normalizeText(text);
  return clean.length <= size ? clean : `${clean.slice(0, size)}…`;
}
