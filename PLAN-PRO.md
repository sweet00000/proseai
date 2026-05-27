# ProseAI Pro — Architecture & Roadmap

## Overview

Free tier: SmolLM2 in browser, no server, no cost.
Pro tier: Gemini API via Lambda proxy, credit wallet, Stripe payments, dashboard, river progression map.

---

## 1. Credit System Design

### How credits work
- 1 credit = 1 AI feedback session (1 Gemini call)
- Credits stored server-side per user — never trust the client
- Every feedback request: check credits → call Gemini → deduct 1 credit → return response
- If 0 credits: return 402, show "buy more" modal

### Credit economics
```
Gemini 1.5 Flash cost per feedback call:
  ~300 input tokens + ~150 output tokens
  = ~$0.000035 per call (at current pricing)

Your price to user:
  Starter  —  30 credits  / $2.99   → $0.10/call  (~285× markup)
  Popular  — 100 credits  / $7.99   → $0.08/call  (~228× markup)
  Power    — 300 credits  / $19.99  → $0.067/call (~190× markup)
  Monthly  — 200 credits/mo / $9.99 → refreshes each billing cycle
```

### Credit table schema (DynamoDB)
```
PK: user#{userId}
SK: credits
Fields:
  balance: number       — current credits
  totalPurchased: number
  totalUsed: number
  lastRefillAt: ISO8601 — for subscription refresh
  plan: "free" | "starter" | "popular" | "power" | "monthly"
```

---

## 2. Backend Architecture

```
Browser (Pro user)
    │
    ▼
Lambda: POST /feedback
    ├─ verify JWT (Clerk/Auth0)
    ├─ check credits in DynamoDB (atomic read)
    ├─ if balance < 1 → 402 { error: "no_credits" }
    ├─ call Gemini API (API key never leaves Lambda)
    ├─ atomic decrement credits in DynamoDB
    └─ return { feedback, creditsRemaining }

Lambda: POST /checkout
    ├─ verify JWT
    ├─ create Stripe Checkout session (price_id, user metadata)
    └─ return { checkoutUrl }

Lambda: POST /stripe-webhook
    ├─ verify Stripe signature (CRITICAL — reject unsigned requests)
    ├─ on checkout.session.completed:
    │   └─ add credits to DynamoDB based on price_id
    └─ 200 OK

Lambda: GET /me
    ├─ verify JWT
    └─ return { balance, totalUsed, plan, streakDays }
```

### Stack
| Layer | Choice | Why |
|---|---|---|
| Functions | AWS Lambda (Node 20) | User specified; Cloudflare Workers is cheaper alternative |
| Database | DynamoDB | Serverless, atomic increments, no connection pool |
| Auth | Clerk | Magic link + Google OAuth, JWT verify in Lambda in 3 lines |
| Payments | Stripe Checkout | Hosted page, handles SCA/3DS, no card data touches your server |
| AI | Gemini 1.5 Flash | Fast, cheap, strong writing feedback quality |
| Deploy | AWS SAM or SST | Infrastructure as code, easy Lambda + API Gateway |

### Lambda env vars
```
GEMINI_API_KEY=...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
CLERK_SECRET_KEY=...
DYNAMODB_TABLE=proseai-credits
```

---

## 3. Gemini Prompt Shape (writing-focused)

System prompt tuned for writing coaching (not general chat):

```
You are an expert writing coach. Your only job is writing feedback.
Rules:
- 2-4 sentences max, no exceptions
- Lead with the single most impactful fix
- Name the technique (passive voice, hedge words, buried lede, etc.)
- Give a rewritten example of the key sentence
- End with one positive observation
- Never say "great job", "I can see", "it seems like"
- Do not answer questions unrelated to writing
```

Per-lesson skill injection on top of system prompt:
```
Today's focus: {lesson.skill}
Principle: {lesson.tip}
Watch for: {lesson.watchFor}
```

### Gemini call (Lambda)
```js
import { GoogleGenerativeAI } from '@google/generative-ai'

const genai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
const model = genai.getGenerativeModel({
  model: 'gemini-1.5-flash',
  systemInstruction: SYSTEM_PROMPT,
  generationConfig: { maxOutputTokens: 200, temperature: 0.4 },
})

const result = await model.generateContent([
  `Skill focus: ${skill}\nPrinciple: ${tip}`,
  `Student wrote: "${userText}"`,
])
return result.response.text()
```

---

## 4. Frontend — Pro App Changes

### Credit-aware feedback flow
```js
async function getFeedback(userText, lesson) {
  const token = await clerk.session.getToken()
  const res = await fetch('/feedback', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: userText, lessonId: lesson.id }),
  })
  if (res.status === 402) { showBuyCreditsModal(); return }
  const { feedback, creditsRemaining } = await res.json()
  updateCreditBadge(creditsRemaining)
  return feedback
}
```

### Credit badge in topbar
- Shows `⚡ 47 credits` next to streak
- Pulses orange when < 10 credits
- Clicking opens buy modal

### Buy credits modal
- Three tier cards (Starter / Popular / Power)
- Each has a "Buy" button → hits `/checkout` → redirects to Stripe
- Monthly plan option highlighted
- On return from Stripe: poll `/me` to confirm credit top-up

---

## 5. River Progression Map (UI)

Visual lesson path: cartoon river flowing up the screen, stepping stones across it.

```
Structure:
  RiverMap
  ├─ SVG river background (animated water shimmer)
  ├─ SteppingStone × N (one per lesson cluster)
  │   ├─ completed → glowing, colored by skill type
  │   ├─ current   → pulsing ring, avatar standing on it
  │   └─ locked    → greyed out, lock icon
  ├─ PlayerAvatar  (frog or small character, sitting on current stone)
  └─ SkillBadges   (floating labels: "Clarity", "Tone", "Hooks" etc.)

Interaction:
  click completed stone → replay lesson (review mode)
  click current stone   → enter lesson
  click locked stone    → "unlock with X credits" or "reach this level first"
```

### Stone grouping
```
Stone 1-3:   Clarity track      (purple)
Stone 4-6:   Conciseness track  (pink)
Stone 7-9:   Hooks track        (coral)
Stone 10-12: Tone track         (peach)
Stone 13-15: Structure track    (gold)
Stone 16+:   Mastery challenges (gradient — all skills mixed)
```

### Tech
- SVG for river + stones (scalable, animatable)
- CSS `@keyframes` for water shimmer, stone glow pulse, avatar idle bounce
- State from `/me` endpoint: which lesson IDs are completed → which stones are lit
- No heavy canvas library needed

---

## 6. Dashboard (Pro only)

Sections:
- **Progress ring** — writing score over time (sparkline, last 30 lessons)
- **Skill radar** — hexagonal chart, one axis per skill (Clarity / Tone / Hooks / etc.)
- **Credit wallet** — balance, usage this week, buy button
- **Streak calendar** — GitHub-style heatmap of lesson days
- **Best rewrites** — saved examples of user's strongest submissions

Stack: plain SVG charts (no Chart.js dependency needed for these shapes).

---

## 7. Stripe Integration Detail

### Products to create in Stripe dashboard
```
prod_starter  — "30 AI Sessions"    price: $2.99  one-time
prod_popular  — "100 AI Sessions"   price: $7.99  one-time
prod_power    — "300 AI Sessions"   price: $19.99 one-time
prod_monthly  — "Monthly Pro"       price: $9.99  recurring (200 credits/mo refresh)
```

### Webhook handler (Lambda)
```js
// ALWAYS verify signature first — unauthenticated webhook = credit fraud vector
const sig = req.headers['stripe-signature']
const event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET)

if (event.type === 'checkout.session.completed') {
  const session = event.data.object
  const userId = session.metadata.userId        // set this when creating checkout session
  const priceId = session.line_items?.[0]?.price?.id

  const creditsToAdd = PRICE_CREDIT_MAP[priceId] // { price_xxx: 30, price_yyy: 100, ... }
  await dynamodb.update({
    Key: { PK: `user#${userId}`, SK: 'credits' },
    UpdateExpression: 'ADD balance :n SET totalPurchased = totalPurchased + :n',
    ExpressionAttributeValues: { ':n': creditsToAdd },
  })
}
```

### Monthly subscription refresh (EventBridge cron)
```
Schedule: rate(1 day)
Lambda checks DynamoDB for users where:
  plan = 'monthly' AND lastRefillAt < now - 30 days
→ set balance = 200, update lastRefillAt
```

---

## 8. Build Order (Pro)

```
Phase 1 — Auth + backend skeleton
  [ ] Set up Clerk project, add login to app.html
  [ ] AWS SAM template: Lambda + API Gateway + DynamoDB table
  [ ] Lambda: GET /me (returns balance, plan, streak)
  [ ] Lambda: verify JWT middleware (shared across all routes)

Phase 2 — Credits + Gemini
  [ ] Lambda: POST /feedback (credit check → Gemini → deduct → return)
  [ ] Wire pro app to /feedback instead of local SmolLM2
  [ ] Credit badge in topbar, "no credits" modal

Phase 3 — Stripe
  [ ] Create products in Stripe dashboard
  [ ] Lambda: POST /checkout (create Stripe session)
  [ ] Lambda: POST /stripe-webhook (add credits on payment)
  [ ] Buy credits modal in frontend

Phase 4 — River map
  [ ] SVG river component
  [ ] SteppingStone component (completed / current / locked states)
  [ ] Wire to /me lesson completion data
  [ ] Player avatar idle animation

Phase 5 — Dashboard
  [ ] Progress ring (writing score sparkline)
  [ ] Skill radar chart (SVG hexagon)
  [ ] Streak heatmap
  [ ] Credit wallet widget

Phase 6 — Polish
  [ ] Monthly subscription + EventBridge refresh cron
  [ ] Email on low credits (< 5 remaining) via SES
  [ ] Referral credits (give 5 credits per referred signup)
```

---

## 9. Security Checklist

- [ ] Stripe webhook: ALWAYS verify signature — without this anyone can POST fake payments
- [ ] DynamoDB credit decrement: use conditional expression (`balance >= 1`) — prevents race condition overdraft
- [ ] Gemini API key: Lambda env var only, never in frontend
- [ ] JWT: verify on every Lambda invocation, never trust client-sent userId
- [ ] Rate limit `/feedback`: 10 req/min per user (API Gateway usage plan)
- [ ] CORS: allow only your domain on API Gateway

---

## 10. Cost Estimate at Scale

```
1,000 active Pro users × 100 sessions/mo:

Gemini 1.5 Flash:  100K calls × $0.000035  = $3.50/mo
Lambda:            100K calls × $0.0000002 = $0.02/mo
DynamoDB:          ~100K writes            = $0.13/mo
Total infra cost:  ~$3.65/mo

Revenue (avg $8 ARPU):  $8,000/mo
Gross margin:           ~99.95%
```
