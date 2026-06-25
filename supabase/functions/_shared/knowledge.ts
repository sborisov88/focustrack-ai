export type KnowledgeChunkInput = {
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

  for (const sentence of paragraph.split(/(?<=[.!?。！？])\s+/u)) {
    if (sentence.length > maxChars) {
      const words = sentence.split(/\s+/)
      for (const word of words) {
        const next = current ? `${current} ${word}` : word
        if (next.length > maxChars && current) {
          parts.push(current)
          current = word
        } else {
          current = next
        }
      }
      continue
    }

    const next = current ? `${current} ${sentence}` : sentence
    if (next.length > maxChars && current) {
      parts.push(current)
      current = sentence
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
): KnowledgeChunkInput[] {
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

export async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(value),
  )
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}
