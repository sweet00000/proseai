import { verifyToken, AuthError } from '../auth.js'
import { getStripe } from '../stripe-client.js'

const PRICES = [
  { id: 'starter',  label: '30 AI Sessions',   priceId: 'price_REPLACE_STARTER',  amount: '$2.99' },
  { id: 'popular',  label: '100 AI Sessions',  priceId: 'price_REPLACE_POPULAR',  amount: '$7.99' },
  { id: 'power',    label: '300 AI Sessions',  priceId: 'price_REPLACE_POWER',    amount: '$19.99' },
  { id: 'monthly',  label: 'Monthly Pro',      priceId: 'price_REPLACE_MONTHLY',  amount: '$9.99/mo' },
]

export async function checkoutRoute(request, env) {
  let userId, email
  try {
    ;({ userId, email } = await verifyToken(env, request))
  } catch (e) {
    if (e instanceof AuthError) return json({ error: e.code }, e.status)
    throw e
  }

  const { tier } = await request.json()
  const price = PRICES.find(p => p.id === tier)
  if (!price) return json({ error: 'invalid_tier' }, 400)

  const stripe = getStripe(env)
  const session = await stripe.checkout.sessions.create({
    mode: price.id === 'monthly' ? 'subscription' : 'payment',
    customer_email: email,
    line_items: [{ price: price.priceId, quantity: 1 }],
    success_url: `${env.FRONTEND_URL}/app-pro.html?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${env.FRONTEND_URL}/app-pro.html`,
    metadata: { userId },
  })

  return json({ checkoutUrl: session.url })
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
