import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false

let embedder = null

export async function loadEmbedder(onProgress) {
  if (embedder) return embedder
  embedder = await pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', {
    progress_callback: onProgress,
  })
  return embedder
}

export async function embed(text) {
  const model = await loadEmbedder()
  const output = await model(text, { pooling: 'mean', normalize: true })
  return Array.from(output.data)
}

export function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}
