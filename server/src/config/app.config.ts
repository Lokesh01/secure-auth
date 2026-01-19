import { getEnv } from '#common/utils/get-env';
import type { StringValue } from 'ms';

// Why StringValue instead of string?
// The ms library (which jsonwebtoken uses internally) only accepts specific time format strings like:
// '2 days', '1d', '10h'
// '2.5 hrs', '2h', '1m'
// '5s', '1y', '100'
// By using the StringValue type, TypeScript ensures you're passing valid time strings. It's a branded type that provides extra type safety at compile time.

const appConfig = () => ({
  NODE_ENV: getEnv('NODE_ENV', 'development'),
  APP_ORIGIN: getEnv('APP_ORIGIN', 'localhost'),
  PORT: getEnv('PORT', '5000'),
  BASE_PATH: getEnv('BASE_PATH', '/api/v1'),
  MONGO_URI: getEnv('MONGO_URI'),
  JWT: {
    SECRET: getEnv('JWT_SECRET'),
    EXPIRES_IN: getEnv('JWT_EXPIRES_IN', '15m') as StringValue,
    REFRESH_SECRET: getEnv('JWT_REFRESH_SECRET'),
    REFRESH_EXPIRES_IN: getEnv('JWT_REFRESH_EXPIRES_IN', '30d') as StringValue,
    AUDIENCE: getEnv('JWT_AUDIENCE', 'user'),
  },
  MAILER_SENDER: getEnv('MAILER_SENDER'),
  RESEND_API_KEY: getEnv('RESEND_API_KEY'),
});

export const config = appConfig();
