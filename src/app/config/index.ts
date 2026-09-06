import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(process.cwd(), '.env') });

export default {
  env: process.env.NODE_ENV || 'development',
  port: process.env.PORT || 5000,
  database_url: process.env.DATABASE_URL,
  bcrypt_salt_rounds: Number(process.env.BCRYPT_SALT_ROUNDS) || 12,
  jwt: {
    secret: process.env.JWT_SECRET || 'devjudge_jwt_secret_fallback_key_2026',
    expires_in: process.env.JWT_EXPIRES_IN || '7d',
    refresh_secret: process.env.JWT_REFRESH_SECRET || 'devjudge_jwt_refresh_secret_fallback_key_2026',
    refresh_expires_in: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },
  google: {
    client_id: process.env.GOOGLE_CLIENT_ID || '',
  },
  stripe: {
    secret_key: process.env.STRIPE_SECRET_KEY || '',
    webhook_secret: process.env.STRIPE_WEBHOOK_SECRET || '',
    client_url: process.env.CLIENT_URL || 'http://localhost:3000',
  },
};
