// POST /api/activate — called after Stripe redirect with ?session_id=xxx
// Verifies the session is paid, creates/fetches user, issues JWT

import { getStripe } from '../stripe-client.js'
import { upsertUser } from '../db.js'
import { issueToken } from '../auth.js'

export async function activateRoute(request, env) {
  const { sessionId } = await request.json()
  if (!sessionId) return json({ error: 'missing_session_id' }, 400)

  const stripe = getStripe(env)
  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId)
  } catch {
    return json({ error: 'invalid_session' }, 400)
  }

  if (session.payment_status !== 'paid' && session.status !== 'complete') {
    return json({ error: 'not_paid' }, 402)
  }

  const email = session.customer_email
  const customerId = String(session.customer)

  await upsertUser(env, { id: customerId, email })

  const user = await env.DB.prepare(
    'SELECT jwt_version FROM users WHERE id = ?'
  ).bind(customerId).first()

  const token = await issueToken(env, {
    userId: customerId,
    email,
    jwtVersion: user.jwt_version,
  })

  return json({ token, email })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
