export type KnowledgeChunk = {
  chunkIndex: number
  content: string
}

const DEFAULT_MAX_CHUNK_CHARS = 1400
const DEFAULT_OVERLAP_CHARS = 180

function normalizeText(value: string) {
  return value
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((paragraph) =>
      paragraph
        .split("\n")
        .map((line) => line.trim().replace(/\s+/g, " "))
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join("\n\n")
}

function splitLongParagraph(paragraph: string, maxChars: number) {
  if (paragraph.length <= maxChars) return [paragraph]

  const parts: string[] = []
  let current = ""

  for (const word of paragraph.split(/\s+/)) {
    const next = current ? `${current} ${word}` : word
    if (next.length > maxChars && current) {
      parts.push(current)
      current = word
    } else {
      current = next
    }
  }

  if (current) parts.push(current)
  return parts
}

function tailOverlap(value: string, overlapChars: number) {
  if (value.length <= overlapChars) return value
  return value.slice(value.length - overlapChars).replace(/^\S+\s*/, "")
}

export function splitKnowledgeContentIntoChunks(
  content: string,
  {
    maxChunkChars = DEFAULT_MAX_CHUNK_CHARS,
    overlapChars = DEFAULT_OVERLAP_CHARS,
  }: { maxChunkChars?: number; overlapChars?: number } = {},
): KnowledgeChunk[] {
  const normalized = normalizeText(content)
  if (!normalized) return []

  const paragraphs = normalized
    .split(/\n{2,}/)
    .flatMap((paragraph) => splitLongParagraph(paragraph, maxChunkChars))
  const chunks: string[] = []
  let current = ""

  for (const paragraph of paragraphs) {
    const next = current ? `${current}\n\n${paragraph}` : paragraph
    if (next.length > maxChunkChars && current) {
      chunks.push(current)
      const overlap = tailOverlap(current, overlapChars)
      current = overlap ? `${overlap}\n\n${paragraph}` : paragraph
    } else {
      current = next
    }
  }

  if (current) chunks.push(current)

  return chunks.map((chunk, index) => ({
    chunkIndex: index,
    content: chunk,
  }))
}
