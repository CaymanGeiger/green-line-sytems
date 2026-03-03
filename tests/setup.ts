process.env.DATABASE_URL = process.env.DATABASE_URL ?? "file:./test.db";
process.env.AUTH_JWT_SECRET =
  process.env.AUTH_JWT_SECRET ?? "test_secret_key_minimum_32_chars_long_value";
process.env.INTERNAL_SYNC_TOKEN =
  process.env.INTERNAL_SYNC_TOKEN ?? "internal_sync_token_for_tests";
process.env.RESEND_API_KEY = process.env.RESEND_API_KEY ?? "";
process.env.RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? "";
process.env.APP_URL = process.env.APP_URL ?? "http://localhost:3000";
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
