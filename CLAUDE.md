# ProseAI — Project Context for Claude Code

## What this is
Duolingo-style AI writing coach. Free tier runs **100% in the browser** — no server, no API keys, no cost per user.

## Stack (browser-only, no Python)
| Layer | Tech | Why |
|---|---|---|
| LM inference | [SmolLM2-360M-Instruct](https://huggingface.co/HuggingFaceTB/SmolLM2-360M-Instruct) via **transformers.js** | Runs in browser via WebAssembly/WebGPU |
| Embeddings | `Xenova/all-MiniLM-L6-v2` via **transformers.js** | Fast, tiny, browser-compatible |
| Context retrieval | Cosine similarity in plain JS | No vector DB needed — lessons fit in memory |
| UI | Vanilla JS + CSS (no framework) | Keep it light and fast to ship |
| Bundler | Vite | ES modules, fast HMR |

## File layout
```
proseai/
├── index.html          ✅ landing page (done — DO NOT TOUCH)
├── app.html            app shell (entry point after "Start Free")
├── src/
│   ├── model.js        SmolLM2 loader, text generation, prompt builder
│   ├── embeddings.js   embedding model + cosine similarity function
│   ├── rag.js          context retrieval — embed user input, find top-k lessons
│   ├── lessons.js      lesson runner, XP system, streak logic
│   └── ui.js           DOM wiring, lesson display, feedback rendering
├── data/
│   └── lessons.json    lesson content: prompts, examples, bad/good pairs, embeddings
├── styles/
│   └── app.css         app UI styles (match landing page Easter palette)
├── CLAUDE.md           ← you are here
└── package.json        Vite + transformers.js dep
```

## Architecture — how it flows

```
User types response
      ↓
embeddings.js: embed(userText)  →  float32 vector
      ↓
rag.js: cosineSimilarity(userVec, lessonVecs[])  →  top-3 relevant examples
      ↓
model.js: buildPrompt(userText, relevantExamples, lessonGoal)
      →  SmolLM2 generates feedback
      ↓
ui.js: render feedback, award XP, update streak
```

## Prompt pattern for SmolLM2
SmolLM2-Instruct uses ChatML format:
```
<|im_start|>system
You are a writing coach. Give specific, actionable feedback in 2-3 sentences.
Focus on: {lessonGoal}. Reference these examples: {retrievedContext}
<|im_end|>
<|im_start|>user
The student wrote: "{userText}"
What one thing should they improve and how?
<|im_end|>
<|im_start|>assistant
```

Keep system prompt under 300 tokens — SmolLM2-360M has 2k context.

## RAG context strategy
- `data/lessons.json` holds ~50 writing lessons
- Each lesson has: `id`, `skill`, `prompt`, `good_example`, `bad_example`, `tip`, `embedding`
- Embeddings pre-computed once at build time and baked into the JSON
- At runtime: embed user text → cosine similarity → inject top-2 `tip` strings into prompt
- No vector DB needed — 50 lessons × 384 dims = tiny

## Cosine similarity (implement this exactly)
```js
function cosineSimilarity(a, b) {
  let dot = 0, normA = 0, normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
```

## Model loading UX
- Show progress bar while model downloads (transformers.js emits progress events)
- Cache in IndexedDB automatically (transformers.js default) — second load is instant
- SmolLM2-360M ≈ 720MB ONNX download first time, ~instant after cache
- Fallback message if WebGPU unavailable: "using CPU mode, slightly slower"

## Design system (match landing page)
```css
/* Easter palette — copy from index.html */
--lavender:  #c084fc;
--pink:      #f472b6;
--peach:     #fb923c;
--gold:      #fbbf24;
--deep:      #1e1035;
--muted:     #7c6b9e;
--easter-vivid: linear-gradient(105deg, #c084fc, #f472b6, #fb923c, #fbbf24);

/* Glass card pattern */
background: rgba(255,255,255,0.55);
backdrop-filter: blur(24px) saturate(180%);
border: 1.5px solid rgba(255,255,255,0.75);
```

## Gamification
- **XP**: +10 base per lesson, +5 bonus if feedback score > 70
- **Streak**: stored in localStorage, reset if >24h gap
- **Writing score**: rolling average of last 10 lesson scores (0–100)
- **Levels**: 0-200 XP = Beginner, 200-600 = Developing, 600-1400 = Skilled, 1400+ = Expert

## Lessons JSON schema
```json
{
  "id": "clarity-01",
  "skill": "Clarity",
  "difficulty": 1,
  "prompt": "Rewrite this sentence to be clearer: ...",
  "bad_example": "...",
  "good_example": "...",
  "tip": "Remove filler words like 'basically', 'kind of', 'I think'.",
  "embedding": [0.123, -0.456, ...]
}
```

## Build order (implement in this sequence)
1. `package.json` + Vite config
2. `data/lessons.json` — 10 starter lessons, embeddings TBD (compute at first run)
3. `src/embeddings.js` — load model, embed, cosine similarity
4. `src/model.js` — load SmolLM2, buildPrompt(), generate()
5. `src/rag.js` — retrieveContext(userText, lessons)
6. `src/lessons.js` — lesson state machine, XP, streak, localStorage
7. `styles/app.css` — Easter palette, glass cards, match landing
8. `app.html` + `src/ui.js` — wire everything together

## Critical implementation notes (already done — do not regress)

- **JSON import**: use `fetch('./data/lessons.json').then(r => r.json())` — NOT `import x from '*.json' assert { type: 'json' }` (breaks Vite/browser)
- **WebGPU detection**: always explicit — `navigator.gpu?.requestAdapter()` — do NOT pass `device: 'webgpu'` blindly; falls back to `'wasm'`
- **Output parsing**: use `raw[raw.length - 1]` for last message (new assistant reply), NOT `.find(m => m.role === 'assistant')` which can return the wrong message
- **Score**: hedge-word removal (40pts) + conciseness (30pts) + base (30pts) — NOT string length ratio
- `getDevice()` export on model.js returns active device string for UI badge

## Do not
- Add a backend or server for the free tier
- Use React/Vue/Angular — vanilla JS only
- Change `index.html` (landing page is final)
- Use OpenAI or any paid API
- Add Python unless user explicitly asks
