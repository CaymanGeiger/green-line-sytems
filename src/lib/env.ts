import { z } from "zod";

const NODE_ENV_SCHEMA = z.enum(["development", "test", "production"]);
const URL_SCHEMA = z.string().url();

function requireMinLength(name: string, minLength: number, label?: string): string {
  const value = process.env[name] ?? "";
  if (value.length < minLength) {
    throw new Error(label ?? `${name} must be at least ${minLength} characters`);
  }
  return value;
}

function requireNonEmpty(name: string): string {
  const value = process.env[name] ?? "";
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

function resolveAppUrl(): string {
  const candidate = process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  const parsed = URL_SCHEMA.safeParse(candidate);
  if (!parsed.success) {
    throw new Error("APP_URL must be a valid URL");
  }
  return parsed.data;
}

function resolveNodeEnv(): "development" | "test" | "production" {
  const candidate = process.env.NODE_ENV ?? "development";
  const parsed = NODE_ENV_SCHEMA.safeParse(candidate);
  return parsed.success ? parsed.data : "development";
}

export const env = {
  get DATABASE_URL(): string {
    return requireNonEmpty("DATABASE_URL");
  },
  get AUTH_JWT_SECRET(): string {
    return requireMinLength("AUTH_JWT_SECRET", 32, "AUTH_JWT_SECRET must be at least 32 characters");
  },
  get INTERNAL_SYNC_TOKEN(): string {
    return requireMinLength("INTERNAL_SYNC_TOKEN", 16, "INTERNAL_SYNC_TOKEN must be at least 16 characters");
  },
  get RESEND_API_KEY(): string {
    return process.env.RESEND_API_KEY ?? "";
  },
  get RESEND_FROM_EMAIL(): string {
    return process.env.RESEND_FROM_EMAIL ?? "";
  },
  get APP_URL(): string {
    return resolveAppUrl();
  },
  get NODE_ENV(): "development" | "test" | "production" {
    return resolveNodeEnv();
  },
};
