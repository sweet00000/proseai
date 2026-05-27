import { loadModel, buildPrompt, generate, getDevice } from './model.js'
import { loadEmbedder } from './embeddings.js'
import { indexLessons, retrieveContext } from './rag.js'
import {
  loadState, saveState, updateStreak,
  awardXP, recordScore, writingScore,
  nextLesson, level,
} from './lessons.js'

// import.meta.env?.BASE_URL = '/proseai/' via Vite build, undefined in raw browser → './'
const BASE = import.meta.env?.BASE_URL ?? './'
const lessonsData = await fetch(`${BASE}data/lessons.json`).then(r => r.json())
const lessons = lessonsData.lessons

let state = loadState()
let currentLesson = nextLesson(lessons, state)

// ── DOM refs ──
const loadScreen   = document.getElementById('load-screen')
const lessonView   = document.getElementById('lesson-view')
const loadBar      = document.getElementById('load-bar')
const loadLabel    = document.getElementById('load-label')
const deviceBadge  = document.getElementById('device-badge')
const skillBadge   = document.getElementById('skill-badge')
const lessonPrompt = document.getElementById('lesson-prompt')
const userInput    = document.getElementById('user-input')
const submitBtn    = document.getElementById('submit-btn')
const feedbackWrap = document.getElementById('feedback-wrap')
const thinkingEl   = document.getElementById('thinking')
const feedbackText = document.getElementById('feedback-text')
const xpToast      = document.getElementById('xp-toast')
const examplesEl   = document.getElementById('examples')
const badExample   = document.getElementById('bad-example')
const goodExample  = document.getElementById('good-example')
const nextRow      = document.getElementById('next-row')
const nextBtn      = document.getElementById('next-btn')

// ── hedge words used in scoring ──
const HEDGES = [
  'basically', 'kind of', 'i think', 'sort of', 'very ', 'really ',
  'just ', 'actually ', 'a lot of', 'there are', 'in order to',
  'due to the fact', 'at this point in time', 'it is important to note',
  'it should be noted', 'as a matter of fact', 'in my opinion',
]

function scoreRewrite(userText, lesson) {
  const lower = userText.toLowerCase()
  const origLower = lesson.bad_example.toLowerCase()
  if (userText.length < 10) return 0

  // 30pts base for attempting
  let score = 30

  // 40pts for removing hedge words
  const origHedges = HEDGES.filter(h => origLower.includes(h)).length
  const userHedges  = HEDGES.filter(h => lower.includes(h)).length
  if (origHedges > 0) {
    score += Math.round(((origHedges - userHedges) / origHedges) * 40)
  } else {
    score += 20
  }

  // 30pts for conciseness (shorter + still substantive)
  const origWords = origLower.split(/\s+/).length
  const userWords  = lower.split(/\s+/).length
  if (userWords < origWords && userWords > 3) {
    const reduction = (origWords - userWords) / origWords
    score += Math.round(Math.min(30, reduction * 55))
  }

  return Math.min(100, Math.max(0, score))
}

// ── stat bar ──
function refreshStats() {
  document.getElementById('streak').textContent = state.streak
  document.getElementById('xp').textContent = state.xp
  const ws = writingScore(state)
  document.getElementById('wscore').textContent = ws || '–'
}

// ── progress callback ──
let loadPhase = ''
function onProgress(p) {
  const pct = Math.round(p.progress ?? 0)
  loadBar.style.width = Math.max(loadBar.style.width ? parseInt(loadBar.style.width) : 0, pct) + '%'
  if (p.status === 'ready') {
    loadLabel.textContent = `${loadPhase} ready ✓`
    return
  }
  if (p.file) {
    const shortFile = p.file.split('/').pop()
    loadLabel.textContent = `${loadPhase}: ${shortFile} — ${pct}%`
  } else if (p.status) {
    loadLabel.textContent = `${loadPhase}: ${p.status}`
  }
}

// ── init ──
async function init() {
  refreshStats()
  try {
    loadPhase = 'Embedding model'
    loadLabel.textContent = 'Loading embedding model (all-MiniLM-L6-v2)…'
    await loadEmbedder(onProgress)

    loadBar.style.width = '0%'
    loadPhase = 'SmolLM2-360M'
    loadLabel.textContent = 'Loading SmolLM2-360M-Instruct (first load ~200MB, cached after)…'
    await loadModel(onProgress)

    if (deviceBadge) {
      const dev = getDevice()
      deviceBadge.textContent = dev === 'webgpu' ? '⚡ WebGPU' : '🖥 CPU mode'
      deviceBadge.style.display = 'inline-flex'
    }

    loadPhase = 'Lessons'
    loadLabel.textContent = 'Indexing lessons…'
    await indexLessons(lessons)

    loadScreen.style.display = 'none'
    lessonView.style.display = 'block'
    renderLesson(currentLesson)
  } catch (err) {
    loadLabel.textContent = `Error: ${err.message}`
    loadLabel.style.color = '#e11d48'
    console.error(err)
  }
}

function renderLesson(lesson) {
  skillBadge.textContent = `✍️ ${lesson.skill}`
  lessonPrompt.textContent = lesson.prompt
  userInput.value = ''
  feedbackWrap.style.display = 'none'
  userInput.focus()
}

// ── submit ──
submitBtn.addEventListener('click', async () => {
  const text = userInput.value.trim()
  if (!text || text.length < 10) {
    userInput.style.borderColor = 'rgba(244,114,182,0.6)'
    userInput.focus()
    return
  }
  userInput.style.borderColor = ''

  submitBtn.disabled = true
  feedbackWrap.style.display = 'block'
  thinkingEl.style.display = 'flex'
  feedbackText.style.display = 'none'
  xpToast.style.display = 'none'
  examplesEl.style.display = 'none'
  nextRow.style.display = 'none'

  try {
    const tips = await retrieveContext(text, lessons)
    const messages = buildPrompt(text, tips, currentLesson.skill)
    const feedback = await generate(messages)

    thinkingEl.style.display = 'none'
    feedbackText.textContent = feedback || '(No feedback generated — try rephrasing your response.)'
    feedbackText.style.display = 'block'

    const score = scoreRewrite(text, currentLesson)

    state = updateStreak(state)
    state = awardXP(state, score)
    state = recordScore(state, score)
    state.completedIds = [...new Set([...state.completedIds, currentLesson.id])]
    saveState(state)
    refreshStats()

    const earned = score > 70 ? 15 : 10
    const lvl = level(state.xp)
    xpToast.textContent = `⚡ +${earned} XP · Score: ${score}/100 · ${lvl.name}`
    xpToast.style.display = 'inline-flex'

    badExample.textContent = currentLesson.bad_example
    goodExample.textContent = currentLesson.good_example
    examplesEl.style.display = 'grid'
    nextRow.style.display = 'flex'
  } catch (err) {
    thinkingEl.style.display = 'none'
    feedbackText.textContent = `Error: ${err.message}`
    feedbackText.style.color = '#e11d48'
    feedbackText.style.display = 'block'
    console.error(err)
  } finally {
    submitBtn.disabled = false
  }
})

// ── next lesson ──
nextBtn.addEventListener('click', () => {
  state.currentIndex = (state.currentIndex + 1) % lessons.length
  saveState(state)
  currentLesson = nextLesson(lessons, state)
  renderLesson(currentLesson)
})

init()
