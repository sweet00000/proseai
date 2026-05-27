import { verifyToken, AuthError } from '../auth.js'
import { getCredits } from '../db.js'

export async function meRoute(request, env) {
  let userId, email
  try {
    ;({ userId, email } = await verifyToken(env, request))
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.code }, e.status)
    throw e
  }

  const credits = await getCredits(env, userId)
  if (!credits) return json({ error: 'user_not_found' }, 404)

  return json({
    userId,
    email,
    balance: credits.balance,
    totalPurchased: credits.total_purchased,
    totalUsed: credits.total_used,
    plan: credits.plan,
  })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
