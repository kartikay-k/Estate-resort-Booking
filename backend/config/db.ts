import mongoose from 'mongoose';
import { env } from './env.js';

/**
 * MongoDB connection handling.
 *
 * Decisions made here:
 * - `connectDatabase()` is **fail-soft**: if Mongo is unreachable the API still
 *   boots and reports `database.state: "disconnected"` from the health check,
 *   instead of crashing the dev loop.
 * - Connection events are logged once, centrally, in the background.
 */

mongoose.set('strictQuery', true);

const CONNECTION_TIMEOUT_MS = 8_000;

const stateLabel = (readyState: number): string => {
  switch (readyState) {
    case 0:
      return 'disconnected';
    case 1:
      return 'connected';
    case 2:
      return 'connecting';
    case 3:
      return 'disconnecting';
    default:
      return 'unknown';
  }
};

export async function connectDatabase(): Promise<boolean> {
  mongoose.connection.on('connected', () =>
    console.log(`[db] MongoDB connected → ${mongoose.connection.name}`),
  );
  mongoose.connection.on('disconnected', () =>
    console.warn('[db] MongoDB disconnected'),
  );
  mongoose.connection.on('error', (err) =>
    console.error('[db] MongoDB error:', err.message),
  );

  try {
    await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: CONNECTION_TIMEOUT_MS,
    });
    return true;
  } catch (err) {
    console.error(
      [
        '\n════════════════════════════════════════════════════════',
        '[db] Could not connect to MongoDB. The API is still running,',
        '     but /api/health will report the database as "disconnected".',
        '',
        '     To fix, either:',
        '       • run local MongoDB:      mongod --dbpath <data-dir>',
        '       • use a free Atlas cluster and update MONGO_URI in backend/.env',
        '════════════════════════════════════════════════════════\n',
      ].join('\n'),
    );
    console.error('[db] Error was:', err instanceof Error ? err.message : err);
    return false;
  }
}

export async function disconnectDatabase(): Promise<void> {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
}

/** Snapshot helper used by the health check controller. */
export function databaseHealth(): {
  state: string;
  name?: string;
  host?: string;
} {
  const conn = mongoose.connection;
  return {
    state: stateLabel(conn.readyState),
    name: conn.name || undefined,
    host: conn.host || undefined,
  };
}
