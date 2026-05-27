import { embed, cosineSimilarity } from './embeddings.js'

// Embed all lessons once and cache in memory
let lessonVecs = null

export async function indexLessons(lessons) {
  // Check localStorage cache first
  const cached = localStorage.getItem('proseai_lesson_vecs')
  if (cached) {
    lessonVecs = JSON.parse(cached)
    return
  }

  lessonVecs = {}
  for (const lesson of lessons) {
    // Embed the tip + bad_example for retrieval signal
    const text = `${lesson.skill}: ${lesson.tip} Example of weak writing: ${lesson.bad_example}`
    lessonVecs[lesson.id] = await embed(text)
  }

  localStorage.setItem('proseai_lesson_vecs', JSON.stringify(lessonVecs))
}

export async function retrieveContext(userText, lessons, topK = 2) {
  if (!lessonVecs) await indexLessons(lessons)

  const queryVec = await embed(userText)

  const scored = lessons.map(lesson => ({
    lesson,
    score: cosineSimilarity(queryVec, lessonVecs[lesson.id] ?? []),
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, topK).map(s => s.lesson.tip)
}
