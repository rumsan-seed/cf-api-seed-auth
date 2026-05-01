import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { Env, JwtPayload } from './types';
import { authMiddleware } from './middleware/auth';
import exampleRoutes from './routes/example';

type Variables = { user: JwtPayload };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ─── Global middleware ──────────────────────────────────────────────────────
app.use('*', cors());

// ─── Root info ──────────────────────────────────────────────────────────────
app.get('/', (c) =>
  c.json({
    name: 'api-cf-workers',
    description: 'Cloudflare Workers API seed project',
    version: '1.0.0',
    status: 'ok',
    endpoints: {
      health: 'GET /health',
      example: 'GET /example',
    },
    timestamp: new Date().toISOString(),
  })
);

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── Authenticated routes ───────────────────────────────────────────────────
app.use('/example/*', authMiddleware);

app.route('/example', exampleRoutes);

// ─── 404 catch-all ──────────────────────────────────────────────────────────
app.notFound((c) => c.json({ error: 'Route not found' }, 404));

app.onError((err, c) => {
  console.error(err);
  return c.json({ error: 'Internal server error' }, 500);
});

export default app;
