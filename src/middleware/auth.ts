import { Context, Next } from 'hono';
import { JwtPayload, Env } from '../types';

/**
 * Parse a PEM public key string and import it as a CryptoKey for RS256 verification.
 * Cloudflare Workers expose the Web Crypto API globally.
 */
async function importPublicKey(pem: string): Promise<CryptoKey> {
  // Strip PEM headers/footers and newlines
  const pemContents = pem
    .replace(/-----BEGIN PUBLIC KEY-----/, '')
    .replace(/-----END PUBLIC KEY-----/, '')
    .replace(/\s+/g, '');

  const binaryDer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));

  return crypto.subtle.importKey(
    'spki',
    binaryDer.buffer,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify'],
  );
}

function base64UrlDecode(str: string): Uint8Array {
  // Convert base64url to base64
  const base64 = str.replace(/-/g, '+').replace(/_/g, '/').padEnd(str.length + ((4 - (str.length % 4)) % 4), '=');
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

async function verifyJwt(token: string, publicKey: CryptoKey): Promise<JwtPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Invalid JWT format');

  const [headerB64, payloadB64, signatureB64] = parts;

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signature = base64UrlDecode(signatureB64);

  const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', publicKey, signature, signingInput);
  if (!valid) throw new Error('JWT signature verification failed');

  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(payloadB64))) as JwtPayload;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) throw new Error('JWT has expired');
  if (payload.iat && payload.iat > now + 60) throw new Error('JWT issued in the future');

  if (!payload.email) throw new Error('JWT missing email claim');

  return payload;
}

// Cache the imported key across requests within the same isolate
let cachedPublicKey: CryptoKey | null = null;
let cachedPem: string | null = null;

export async function authMiddleware(c: Context<{ Bindings: Env; Variables: { user: JwtPayload } }>, next: Next) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Missing or invalid Authorization header' }, 401);
  }

  const token = authHeader.slice(7);
  const pem = c.env.JWT_PUBLIC_KEY;

  if (!pem) {
    return c.json({ error: 'Server misconfiguration: JWT_PUBLIC_KEY not set' }, 500);
  }

  try {
    if (!cachedPublicKey || cachedPem !== pem) {
      cachedPublicKey = await importPublicKey(pem);
      cachedPem = pem;
    }

    const payload = await verifyJwt(token, cachedPublicKey);
    c.set('user', payload);
    await next();
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Authentication failed';
    return c.json({ error: message }, 401);
  }
}
