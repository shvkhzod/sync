import 'dotenv/config';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import sensible from '@fastify/sensible';
import { threadsRoutes } from './routes/threads.js';
import { exportRoutes } from './routes/export.js';
import { closeDb } from './db/client.js';

const isProd = process.env.NODE_ENV === 'production';

const app = Fastify({
  logger: isProd
    ? { level: 'info' }
    : { level: 'info', transport: { target: 'pino-pretty', options: { translateTime: 'SYS:HH:MM:ss.l', ignore: 'pid,hostname' } } }
});

await app.register(sensible);

const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:5173')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

await app.register(cors, {
  origin: (origin, cb) => {
    // Allow same-origin / curl (no Origin header) and any configured origin.
    if (!origin || allowedOrigins.includes(origin)) cb(null, true);
    else cb(new Error(`origin ${origin} not allowed`), false);
  },
  credentials: false,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS']
});

app.get('/healthz', async () => ({ ok: true, service: 'sync-api' }));

await app.register(threadsRoutes);
await app.register(exportRoutes);

const port = Number(process.env.PORT ?? 3000);
const host = process.env.HOST ?? '0.0.0.0';

try {
  await app.listen({ port, host });
} catch (err) {
  app.log.error(err);
  process.exit(1);
}

// Graceful shutdown — drain HTTP, then close the pool.
const shutdown = async (signal: string) => {
  app.log.info({ signal }, 'shutting down');
  try {
    await app.close();
    await closeDb();
    process.exit(0);
  } catch (err) {
    app.log.error({ err }, 'shutdown failed');
    process.exit(1);
  }
};
process.on('SIGINT',  () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
