import crypto from "node:crypto";

import { env } from "@/lib/env";

const EMPLOYEE_ACCESS_REQUEST_VERSION = 1;
const EMPLOYEE_ACCESS_REQUEST_TOKEN_TTL_HOURS = 24 * 14;

type EmployeeAccessRequestPayload = {
  v: number;
  userId: string;
  email: string;
  iat: number;
  exp: number;
};

function getRequestLinkSecret() {
  const secret = env.AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_JWT_SECRET must be set and at least 32 characters.");
  }

  return secret;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

function base64UrlDecode(value: string): string {
  return Buffer.from(value, "base64url").toString("utf8");
}

function signPayload(payloadBase64: string): string {
  return crypto.createHmac("sha256", getRequestLinkSecret()).update(payloadBase64).digest("base64url");
}

function parsePayload(input: unknown): EmployeeAccessRequestPayload | null {
  if (!input || typeof input !== "object") {
    return null;
  }

  const payload = input as Record<string, unknown>;
  if (
    payload.v !== EMPLOYEE_ACCESS_REQUEST_VERSION ||
    typeof payload.userId !== "string" ||
    typeof payload.email !== "string" ||
    typeof payload.iat !== "number" ||
    typeof payload.exp !== "number"
  ) {
    return null;
  }

  return {
    v: payload.v,
    userId: payload.userId,
    email: payload.email.toLowerCase(),
    iat: payload.iat,
    exp: payload.exp,
  };
}

export function createEmployeeAccessRequestToken(userId: string, email: string): string {
  const nowSeconds = Math.floor(Date.now() / 1000);
  const payload: EmployeeAccessRequestPayload = {
    v: EMPLOYEE_ACCESS_REQUEST_VERSION,
    userId,
    email: email.toLowerCase(),
    iat: nowSeconds,
    exp: nowSeconds + EMPLOYEE_ACCESS_REQUEST_TOKEN_TTL_HOURS * 60 * 60,
  };

  const payloadBase64 = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(payloadBase64);
  return `${payloadBase64}.${signature}`;
}

export function parseEmployeeAccessRequestToken(rawToken: string): EmployeeAccessRequestPayload | null {
  const token = rawToken.trim();
  if (!token) {
    return null;
  }

  const [payloadBase64, signature] = token.split(".");
  if (!payloadBase64 || !signature) {
    return null;
  }

  const expectedSignature = signPayload(payloadBase64);
  const expectedBuffer = Buffer.from(expectedSignature);
  const receivedBuffer = Buffer.from(signature);
  if (expectedBuffer.length !== receivedBuffer.length) {
    return null;
  }
  if (!crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
    return null;
  }

  let parsed: unknown = null;
  try {
    parsed = JSON.parse(base64UrlDecode(payloadBase64));
  } catch {
    return null;
  }

  const payload = parsePayload(parsed);
  if (!payload) {
    return null;
  }

  if (payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  return payload;
}

export function buildEmployeeAccessRequestShareLink(userId: string, email: string): string {
  const token = createEmployeeAccessRequestToken(userId, email);
  const url = new URL("/organizations", env.APP_URL);
  url.searchParams.set("employeeAccessRequest", token);
  return url.toString();
}

export function extractEmployeeAccessRequestToken(input: string): string | null {
  const value = input.trim();
  if (!value) {
    return null;
  }

  if (value.includes("://")) {
    try {
      const parsed = new URL(value);
      const fromPrimaryParam = parsed.searchParams.get("employeeAccessRequest");
      if (fromPrimaryParam) {
        return fromPrimaryParam.trim();
      }
      const fromRequestParam = parsed.searchParams.get("request");
      if (fromRequestParam) {
        return fromRequestParam.trim();
      }
      return null;
    } catch {
      return null;
    }
  }

  return value;
}

