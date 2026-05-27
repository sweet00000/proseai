# ProseAI — TODO

## 🔥 P0 — Blockers (do first)

- [ ] Test full load → lesson → feedback flow in browser (`npm run dev`)
- [ ] Verify SmolLM2 q4 actually generates text (check console for errors)
- [ ] Verify `all-MiniLM-L6-v2` embeds + cosine similarity returns sensible top-k
- [ ] Fix if `fetch('./data/lessons.json')` path breaks in Vite (may need `/data/lessons.json`)

---

## 🟠 P1 — App UX (makes it feel real)

- [ ] **Typewriter effect** on AI feedback text — stream characters in as SmolLM2 generates
      → transformers.js supports `callback_function` on generate for streaming tokens
- [ ] **Loading skeleton** — show lesson card shape while models load, not just spinner
- [ ] **Input validation toast** — "write at least a sentence" nudge instead of silent border flash
- [ ] **Lesson counter** — "Lesson 3 of 10 · Clarity track" in skill badge
- [ ] **Confetti / celebration** on streak milestone (7d, 30d)
- [ ] **Empty state** — "You've done all lessons! More coming soon" when pool exhausted

---

## 🟡 P2 — App polish

- [ ] **Keyboard shortcut** — Cmd/Ctrl+Enter submits lesson
- [ ] **Score bar visual** — animated bar showing score/100 in XP toast, not just number
- [ ] **Lesson transition animation** — slide out old card, slide in new on Next
- [ ] **Paste-and-review mode** — free text input, not just lesson rewrites
      → same RAG + SmolLM2 pipeline, just no `bad_example` to compare against
- [ ] **Mobile keyboard push** — fix viewport when soft keyboard opens on textarea focus

---

## 🟢 P3 — Content

- [ ] Expand `data/lessons.json` from 10 → 40+ lessons
      Skills to add: Persuasion, Storytelling, Email subject lines, Headlines, Active voice
- [ ] Add `difficulty` field to lesson routing (start easy, unlock harder)
- [ ] Add lesson "tracks": Professional / Creative / Social / Academic
- [ ] Pre-compute and bake embeddings into lessons.json at build time (script)

---

## 🔵 P4 — Landing page

- [x] "Get started free" pricing button → `app.html`
- [x] CTA band "Start Writing Free" → `app.html`
- [ ] Nav "Start Free" → decide: keep `#pricing` scroll OR go direct to `app.html`
- [ ] Hero secondary CTA → `app.html` (bypass pricing for returning visitors)
- [ ] Add real hero photo (replace CSS sunset placeholder)
- [ ] Pro plan button → payment flow (Stripe, Lemon Squeezy, etc.) when ready

---

## ⚪ P5 — Infrastructure (later)

- [ ] Pro plan: gate unlimited lessons behind `state.plan === 'pro'` flag
- [ ] Auth: simple email magic link (no passwords) to sync streak across devices
- [ ] Analytics: lesson completion rate, where users drop off
- [ ] Deploy: Netlify / Vercel static — no server needed for free tier
