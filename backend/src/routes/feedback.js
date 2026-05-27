import { verifyToken, AuthError } from '../auth.js'
import { deductCredit, logDeduction, getCredits } from '../db.js'
import { getFeedback } from '../gemini.js'

export async function feedbackRoute(request, env) {
  let userId
  try {
    ;({ userId } = await verifyToken(env, request))
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.code }, e.status)
    throw e
  }

  // atomic deduct — returns false if balance was 0
  const deducted = await deductCredit(env, userId)
  if (!deducted) {
    return json({ error: 'no_credits' }, 402)
  }

  let feedback
  try {
    const { userText, skill, tip } = await request.json()
    if (!userText || userText.length < 5) return json({ error: 'text_too_short' }, 400)

    feedback = await getFeedback(env, { userText, skill, tip })
    await logDeduction(env, userId)
  } catch (err) {
    // Gemini failed — refund the credit
    await env.DB.prepare(
      'UPDATE credits SET balance = balance + 1, total_used = total_used - 1 WHERE user_id = ?'
    ).bind(userId).run()
    throw err
  }

  const credits = await getCredits(env, userId)
  return json({ feedback, creditsRemaining: credits.balance })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
