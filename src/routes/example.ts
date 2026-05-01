import { Hono } from 'hono';
import { Env, JwtPayload } from '../types';

const example = new Hono<{ Bindings: Env; Variables: { user: JwtPayload } }>();

// GET /example — returns the authenticated user's profile from the JWT
example.get('/', (c) => {
  const user = c.get('user');
  return c.json({ user });
});

export default example;
