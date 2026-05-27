import { SignJWT, jwtVerify } from 'jose'

function secret(env) {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function issueToken(env, { userId, email, jwtVersion }) {
  return new SignJWT({ email, jwtVersion })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(secret(env))
}

export async function verifyToken(env, request) {
  const auth = request.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null
  if (!token) throw new AuthError('missing_token', 401)

  let payload
  try {
    const result = await jwtVerify(token, secret(env))
    payload = result.payload
  } catch {
    throw new AuthError('invalid_token', 401)
  }

  // confirm jwt_version matches DB (allows server-side invalidation)
  const user = await env.DB.prepare(
    'SELECT id, email, jwt_version FROM users WHERE id = ?'
  ).bind(payload.sub).first()

  if (!user) throw new AuthError('user_not_found', 401)
  if (user.jwt_version !== payload.jwtVersion) throw new AuthError('token_revoked', 401)

  return { userId: user.id, email: user.email }
}

export class AuthError extends Error {
  constructor(code, status) {
    super(code)
    this.code = code
    this.status = status
  }
}
