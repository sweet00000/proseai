const STORAGE_KEY = 'proseai_state'

function defaultState() {
  return {
    xp: 0,
    streak: 0,
    lastLessonDate: null,
    completedIds: [],
    scores: [],           // last 10 lesson scores
    currentIndex: 0,
  }
}

export function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? defaultState()
  } catch {
    return defaultState()
  }
}

export function saveState(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export function updateStreak(state) {
  const today = new Date().toDateString()
  if (state.lastLessonDate === today) return state  // already done today

  const yesterday = new Date(Date.now() - 86400000).toDateString()
  const newStreak = state.lastLessonDate === yesterday ? state.streak + 1 : 1

  return { ...state, streak: newStreak, lastLessonDate: today }
}

export function awardXP(state, score) {
  const base = 10
  const bonus = score > 70 ? 5 : 0
  return { ...state, xp: state.xp + base + bonus }
}

export function recordScore(state, score) {
  const scores = [...state.scores, score].slice(-10)
  return { ...state, scores }
}

export function writingScore(state) {
  if (!state.scores.length) return 0
  return Math.round(state.scores.reduce((a, b) => a + b, 0) / state.scores.length)
}

export function level(xp) {
  if (xp < 200)  return { name: 'Beginner',   next: 200 }
  if (xp < 600)  return { name: 'Developing',  next: 600 }
  if (xp < 1400) return { name: 'Skilled',     next: 1400 }
  return { name: 'Expert', next: null }
}

export function nextLesson(lessons, state) {
  // cycle through lessons, skip completed ones first pass
  const uncompleted = lessons.filter(l => !state.completedIds.includes(l.id))
  const pool = uncompleted.length ? uncompleted : lessons
  return pool[state.currentIndex % pool.length]
}
