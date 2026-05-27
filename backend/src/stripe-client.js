import Stripe from 'stripe'

export function getStripe(env) {
  return new Stripe(env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),  // required for Workers
    apiVersion: '2024-12-18.acacia',
  })
}

// Map your Stripe price IDs → credits awarded
// Create these in Stripe dashboard then paste the price_xxx IDs here
export const PRICE_CREDIT_MAP = {
  // price_STARTER:  30,   // $2.99 — replace with real price IDs
  // price_POPULAR:  100,  // $7.99
  // price_POWER:    300,  // $19.99
  // price_MONTHLY:  200,  // $9.99/mo subscription
}

export function creditsForPrice(priceId) {
  return PRICE_CREDIT_MAP[priceId] ?? null
}
