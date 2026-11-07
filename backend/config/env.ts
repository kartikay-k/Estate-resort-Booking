import 'dotenv/config';

/**
 * Centralized, validated environment configuration.
 * Every value has a safe development default so the API boots even
 * without a .env file, but values should always be set explicitly.
 */

const required = (key: string, fallback: string): string => {
  const raw = process.env[key];
  if (raw === undefined || raw.trim() === '') {
    console.warn(`[env] ${key} is not set — using default: ${fallback}`);
    return fallback;
  }
  return raw.trim();
};

const commaList = (value: string): string[] =>
  value
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

export const env = {
  nodeEnv: required('NODE_ENV', 'development'),
  port: Number(required('PORT', '5001')),
  mongoUri: required(
    'MONGO_URI',
    'mongodb://127.0.0.1:27017/estatestay',
  ),
  clientOrigins: commaList(required('CLIENT_URL', 'http://localhost:5173')),
  jwtSecret: required('JWT_SECRET', 'dev-only-change-this-secret-before-deploying'),
  jwtExpiresIn: required('JWT_EXPIRES_IN', '7d'),
  aiProvider: required('AI_PROVIDER', 'off').toLowerCase(),
  aiApiKey: process.env.AI_API_KEY?.trim() ?? '',
  aiModel: required('AI_MODEL', 'gpt-4o-mini'),
  /** Single source of truth for the API's version string. */
  apiVersion: '1.0.0',
} as const;

export const isProduction = env.nodeEnv === 'production';

if (isProduction && env.jwtSecret === 'dev-only-change-this-secret-before-deploying') {
  throw new Error('JWT_SECRET must be set to a unique secret in production');
}
if (isProduction && (env.mongoUri === 'mongodb://127.0.0.1:27017/estatestay' || env.mongoUri === 'mongodb://localhost:27017/estatestay')) {
  throw new Error('MONGO_URI must point to MongoDB Atlas or another production database');
}
if (isProduction && env.clientOrigins.some((origin) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin))) {
  throw new Error('CLIENT_URL must contain the deployed frontend origin in production, not localhost');
}
