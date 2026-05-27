import { feedbackRoute } from './routes/feedback.js'
import { meRoute }       from './routes/me.js'
import { checkoutRoute } from './routes/checkout.js'
import { webhookRoute }  from './routes/webhook.js'
import { activateRoute } from './routes/activate.js'

const CORS = {
  'Access-Control-Allow-Origin':  '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

export default {
  async fetch(request, env, ctx) {
    const url    = new URL(request.url)
    const method = request.method
    const path   = url.pathname

    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: CORS })
    }

    let response
    try {
      if      (method === 'GET'  && path === '/api/me')       response = await meRoute(request, env)
      else if (method === 'POST' && path === '/api/feedback')  response = await feedbackRoute(request, env)
      else if (method === 'POST' && path === '/api/checkout')  response = await checkoutRoute(request, env)
      else if (method === 'POST' && path === '/api/webhook')   response = await webhookRoute(request, env)
      else if (method === 'POST' && path === '/api/activate')  response = await activateRoute(request, env)
      else response = new Response(JSON.stringify({ error: 'not_found' }), { status: 404 })
    } catch (err) {
      console.error(err)
      response = new Response(JSON.stringify({ error: 'internal_error', detail: err.message }), { status: 500 })
    }

    // Attach CORS headers to every response
    const headers = new Headers(response.headers)
    Object.entries(CORS).forEach(([k, v]) => headers.set(k, v))
    headers.set('Content-Type', 'application/json')

    return new Response(response.body, {
      status:  response.status,
      headers,
    })
  },
}
