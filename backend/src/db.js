// Atomic credit deduction — returns true if credits were available and deducted
export async function deductCredit(env, userId) {
  const result = await env.DB.prepare(`
    UPDATE credits
    SET balance = balance - 1, total_used = total_used + 1
    WHERE user_id = ? AND balance >= 1
  `).bind(userId).run()

  return result.meta.changes > 0
}

export async function addCredits(env, userId, amount, reason, sessionId = null) {
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE credits
      SET balance = balance + ?, total_purchased = total_purchased + ?
      WHERE user_id = ?
    `).bind(amount, amount, userId),
    env.DB.prepare(`
      INSERT INTO credit_log (user_id, delta, reason, stripe_session_id)
      VALUES (?, ?, ?, ?)
    `).bind(userId, amount, reason, sessionId),
  ])
}

export async function getCredits(env, userId) {
  return env.DB.prepare(
    'SELECT balance, total_purchased, total_used, plan FROM credits WHERE user_id = ?'
  ).bind(userId).first()
}

export async function upsertUser(env, { id, email }) {
  await env.DB.batch([
    env.DB.prepare(`
      INSERT INTO users (id, email) VALUES (?, ?)
      ON CONFLICT(id) DO UPDATE SET email = excluded.email
    `).bind(id, email),
    env.DB.prepare(`
      INSERT INTO credits (user_id) VALUES (?)
      ON CONFLICT(user_id) DO NOTHING
    `).bind(id),
  ])
}

export async function logDeduction(env, userId) {
  await env.DB.prepare(`
    INSERT INTO credit_log (user_id, delta, reason) VALUES (?, -1, 'feedback')
  `).bind(userId).run()
}
