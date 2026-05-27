import { getStripe, creditsForPrice } from '../stripe-client.js'
import { upsertUser, addCredits } from '../db.js'
import { issueToken } from '../auth.js'

export async function webhookRoute(request, env) {
  const sig = request.headers.get('stripe-signature')
  const rawBody = await request.text()  // must read before json() — Stripe needs raw body

  const stripe = getStripe(env)
  let event
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, env.STRIPE_WEBHOOK_SECRET)
  } catch {
    return new Response('Invalid signature', { status: 400 })
  }

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object
    const email = session.customer_email
    const customerId = session.customer
    const priceId = session.line_items?.data?.[0]?.price?.id

    // Fetch line items separately if not expanded (Stripe default)
    let resolvedPriceId = priceId
    if (!resolvedPriceId) {
      const items = await stripe.checkout.sessions.listLineItems(session.id)
      resolvedPriceId = items.data[0]?.price?.id
    }

    const credits = creditsForPrice(resolvedPriceId)
    if (!credits) {
      console.error('Unknown price ID:', resolvedPriceId)
      return new Response('OK', { status: 200 })
    }

    await upsertUser(env, { id: customerId, email })
    await addCredits(env, customerId, credits, 'purchase', session.id)

    console.log(`Added ${credits} credits to ${email} (${customerId})`)
  }

  if (event.type === 'invoice.paid') {
    // Subscription renewal — refresh 200 credits
    const invoice = event.data.object
    const customerId = invoice.customer
    if (invoice.subscription) {
      await addCredits(env, customerId, 200, 'subscription_renewal', invoice.id)
    }
  }

  return new Response('OK', { status: 200 })
}
