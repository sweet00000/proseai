import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = false

let generator = null
let activeDevice = 'wasm'

const MODEL_ID = 'HuggingFaceTB/SmolLM2-360M-Instruct'

async function detectDevice() {
  if (!navigator.gpu) return 'wasm'
  try {
    const adapter = await navigator.gpu.requestAdapter()
    return adapter ? 'webgpu' : 'wasm'
  } catch {
    return 'wasm'
  }
}

export async function loadModel(onProgress) {
  if (generator) return generator

  activeDevice = await detectDevice()

  generator = await pipeline('text-generation', MODEL_ID, {
    dtype: 'q4',
    device: activeDevice,
    progress_callback: onProgress,
  })
  return generator
}

export function getDevice() { return activeDevice }

export function buildPrompt(userText, retrievedTips, lessonGoal) {
  const context = retrievedTips.length
    ? `Key writing principles:\n${retrievedTips.map((t, i) => `${i + 1}. ${t}`).join('\n')}`
    : ''

  return [
    {
      role: 'system',
      content: `You are a concise writing coach. Give specific, actionable feedback in 2-3 sentences. Focus on: ${lessonGoal}. ${context}`.trim(),
    },
    {
      role: 'user',
      content: `Student wrote: "${userText}"\n\nWhat is the single most important improvement and how should they make it?`,
    },
  ]
}

export async function generate(messages) {
  const model = await loadModel()
  const result = await model(messages, {
    max_new_tokens: 150,
    temperature: 0.45,
    do_sample: true,
    repetition_penalty: 1.15,
  })

  const raw = result[0]?.generated_text

  if (Array.isArray(raw)) {
    // v3 chat format: last element is the new assistant message
    const last = raw[raw.length - 1]
    if (last?.role === 'assistant') return last.content.trim()
    // fallback: find any assistant message
    const asst = [...raw].reverse().find(m => m.role === 'assistant')
    return asst?.content?.trim() ?? ''
  }

  return String(raw).trim()
}
