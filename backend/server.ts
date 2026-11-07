import app from './app.js';
import { env, isProduction } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';

/**
 * Entry point: connect MongoDB (fail-soft), start Express,
 * and shut down gracefully on SIGINT/SIGTERM.
 */
async function bootstrap(): Promise<void> {
  console.log(
    `\n┌─────────────────────────────────────\n` +
      `│  EstateStay API  ·  node ${process.version}\n` +
      `└─────────────────────────────────────`,
  );

  const dbConnected = await connectDatabase();

  app.listen(env.port, () => {
    console.log(`[api] listening on http://localhost:${env.port}`);
    console.log(`[api] health check:  http://localhost:${env.port}/api/health`);
    console.log(`[api] database:      ${dbConnected ? 'connected' : 'NOT connected (see above)'}`);
    console.log(`[api] environment:   ${env.nodeEnv}`);
  });
}

// ── Graceful shutdown ────────────────────────────────────────
async function shutdown(signal: string): Promise<void> {
  console.log(`\n[api] ${signal} received — shutting down…`);
  await disconnectDatabase();
  process.exit(0);
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  if (!isProduction) console.error('[api] Unhandled rejection:', reason);
});

process.on('uncaughtException', (err) => {
  console.error('[api] Uncaught exception:', err);
  void shutdown('uncaughtException');
});

void bootstrap();
